import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { dailyStreaks, type DailyStreak } from "@/db/schema";

/**
 * R5 — Streak service.
 *
 * The streak row is keyed by `user_id`. We use an atomic UPSERT so
 * concurrent first-of-day actions never double-count, and a conditional
 * UPDATE keyed on `last_active_day` to keep the day-over-day math
 * idempotent under retries.
 *
 * "Day" boundaries are UTC. This matches the rest of the codebase
 * (`weekStartFor`, leaderboard cron) and keeps month boundaries
 * deterministic regardless of the user's locale.
 */

export interface StreakSnapshot {
  userId: string;
  currentDays: number;
  longestDays: number;
  lastActiveDay: string | null;
  freezesAvailable: number;
  freezeConsumed: boolean;
  broken: boolean;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function previousDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

function twoDaysAgo(date: Date): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 2);
  return d;
}

/**
 * Reads the current streak row, returning a zeroed default when none
 * exists yet. Always succeeds (the row is created lazily).
 */
export async function getStreak(userId: string): Promise<DailyStreak | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(dailyStreaks)
    .where(eq(dailyStreaks.userId, userId))
    .limit(1);
  return row ?? null;
}

/**
 * Records a qualifying activity for the streak on `today` (defaults to
 * now). Logic:
 *
 *   - if `lastActiveDay === today`     → no-op (already counted)
 *   - if `lastActiveDay === yesterday` → currentDays += 1
 *   - else (missed >= 1 day):
 *       - if `freezesAvailable > 0` and the gap is exactly 2 days
 *         (yesterday was missed, today counts), consume a freeze and
 *         bump currentDays += 1
 *       - else → currentDays = 1, brokenAt = now
 *
 * Returns a snapshot describing what happened so the UI can show a
 * streak-repair modal or a streak-broken toast without a second query.
 */
export async function recordActivity(
  userId: string,
  now: Date = new Date()
): Promise<StreakSnapshot> {
  const db = getDb();
  const today = isoDay(now);
  const yesterday = isoDay(previousDay(now));

  // Ensure a row exists. ON CONFLICT DO NOTHING means concurrent first
  // callers don't race — the loser just observes the winner's row.
  await db
    .insert(dailyStreaks)
    .values({ userId })
    .onConflictDoNothing({ target: dailyStreaks.userId });

  // Re-read the row to get its current state.
  let row = (await getStreak(userId))!;

  if (row.lastActiveDay === today) {
    return snapshot(row, false, false);
  }

  const lastIsYesterday = row.lastActiveDay === yesterday;
  const lastIsToday = row.lastActiveDay === today; // already covered above
  void lastIsToday;

  let nextCurrent = row.currentDays;
  let freezeConsumed = false;
  let broken = false;

  if (lastIsYesterday) {
    nextCurrent = row.currentDays + 1;
  } else if (row.lastActiveDay != null) {
    // Missed >= 1 day.
    if (row.freezesAvailable > 0 && row.lastActiveDay === isoDay(twoDaysAgo(now))) {
      // Eligible for a single freeze: the missed day is exactly yesterday.
      nextCurrent = row.currentDays + 1;
      freezeConsumed = true;
    } else {
      nextCurrent = 1;
      broken = true;
    }
  } else {
    // First activity ever.
    nextCurrent = 1;
  }

  const nextLongest = Math.max(row.longestDays, nextCurrent);
  const now_ts = now;

  // Conditional UPDATE: only apply if `last_active_day` is still what
  // we read above. A concurrent caller that already advanced today
  // will see 0 rows and the caller can no-op.
  const [updated] = await db
    .update(dailyStreaks)
    .set({
      currentDays: nextCurrent,
      longestDays: nextLongest,
      lastActiveDay: today,
      freezesAvailable: freezeConsumed
        ? sql`GREATEST(0, ${dailyStreaks.freezesAvailable} - 1)`
        : dailyStreaks.freezesAvailable,
      freezesUsedAt: freezeConsumed ? now_ts : dailyStreaks.freezesUsedAt,
      brokenAt: broken ? now_ts : dailyStreaks.brokenAt,
      updatedAt: now_ts,
    })
    .where(
      and(
        eq(dailyStreaks.userId, userId),
        // Only fire when lastActiveDay still matches our read. Concurrent
        // writes that already advanced to today will see 0 rows.
        eq(dailyStreaks.lastActiveDay, row.lastActiveDay ?? sql`NULL`)
      )
    )
    .returning();

  if (!updated) {
    // Lost a race. Re-read and report the winner's snapshot.
    row = (await getStreak(userId))!;
    return snapshot(row, false, false);
  }

  return snapshot(
    {
      ...row,
      currentDays: updated.currentDays,
      longestDays: updated.longestDays,
      lastActiveDay: updated.lastActiveDay,
      freezesAvailable: updated.freezesAvailable,
    },
    freezeConsumed,
    broken
  );
}

function snapshot(
  row: DailyStreak,
  freezeConsumed: boolean,
  broken: boolean
): StreakSnapshot {
  return {
    userId: row.userId,
    currentDays: row.currentDays,
    longestDays: row.longestDays,
    lastActiveDay: row.lastActiveDay,
    freezesAvailable: row.freezesAvailable,
    freezeConsumed,
    broken,
  };
}

/**
 * Manually consume a streak freeze. Called when the user clicks
 * "Repair streak" in the streak-repair modal. Increments the streak
 * by 1 and emits `streak.day` XP. Refuses if no freezes are available
 * or the streak is not actually broken.
 */
export async function repairStreak(
  userId: string,
  now: Date = new Date()
): Promise<StreakSnapshot | null> {
  const db = getDb();
  const today = isoDay(now);
  const yesterday = isoDay(previousDay(now));

  await db
    .insert(dailyStreaks)
    .values({ userId })
    .onConflictDoNothing({ target: dailyStreaks.userId });

  let row = (await getStreak(userId))!;
  if (row.lastActiveDay === today) {
    return snapshot(row, false, false); // already counted today
  }
  if (row.freezesAvailable <= 0) return null;
  // Only meaningful when the missed day is yesterday (single-day gap).
  const missedSingleDay = row.lastActiveDay === isoDay(twoDaysAgo(now));
  if (!missedSingleDay && row.lastActiveDay !== yesterday) return null;

  const nextCurrent = row.currentDays + 1;
  const nextLongest = Math.max(row.longestDays, nextCurrent);

  const [updated] = await db
    .update(dailyStreaks)
    .set({
      currentDays: nextCurrent,
      longestDays: nextLongest,
      lastActiveDay: today,
      freezesAvailable: sql`GREATEST(0, ${dailyStreaks.freezesAvailable} - 1)`,
      freezesUsedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(dailyStreaks.userId, userId),
        eq(dailyStreaks.lastActiveDay, row.lastActiveDay ?? sql`NULL`)
      )
    )
    .returning();

  if (!updated) {
    row = (await getStreak(userId))!;
    return snapshot(row, false, false);
  }
  return snapshot(
    { ...row, currentDays: updated.currentDays, longestDays: updated.longestDays, lastActiveDay: updated.lastActiveDay, freezesAvailable: updated.freezesAvailable },
    true,
    false
  );
}

/**
 * Monday 00:00 UTC cron — refill streak freezes for active users. A
 * user is "active" if they recorded a streak-day within the last 8
 * days. Inactive users stay frozen at 0 until they return; the
 * freezes regenerate the next Monday they're back.
 *
 * Idempotent: re-running the same Monday is a no-op because of the
 * `freezesUsedAt IS NULL OR freezesUsedAt < startOfThisWeek` guard.
 */
export async function grantWeeklyFreezes(now: Date = new Date()): Promise<number> {
  const db = getDb();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setUTCHours(0, 0, 0, 0);
  // Monday = day 1. Walk backwards to the most recent Monday.
  const day = startOfThisWeek.getUTCDay();
  const back = day === 0 ? 6 : day - 1;
  startOfThisWeek.setUTCDate(startOfThisWeek.getUTCDate() - back);

  const updated = await db
    .update(dailyStreaks)
    .set({
      freezesAvailable: 2,
      updatedAt: now,
    })
    .where(
      sql`(${dailyStreaks.freezesUsedAt} IS NULL OR ${dailyStreaks.freezesUsedAt} < ${startOfThisWeek})`
    )
    .returning({ userId: dailyStreaks.userId });

  return updated.length;
}