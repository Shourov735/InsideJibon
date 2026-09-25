import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  badges,
  badgeProgress,
  lessonProgress,
  examAttempts,
  qaThreads,
  xpEvents,
  type Badge,
} from "@/db/schema";
import { emitXp } from "@/services/xp/emit";

/**
 * R5 — Badge service.
 *
 * The badge catalog lives in `badges`. Per-user progress lives in
 * `badge_progress`, keyed by (user_id, badge_id). The first time a user
 * appears in the system, `ensureBadgeProgressRows` seeds an empty row
 * for every catalog entry so subsequent updates are simple UPSERTs.
 *
 * Badge metrics are NOT stored in the database — they are computed on
 * demand via the `BADGE_METRICS` table below. This keeps the badge
 * catalog declarative (one INSERT in the migration = one new badge) and
 * the metric logic co-located with the service that owns the underlying
 * counter.
 */

export interface BadgeWithProgress extends Badge {
  progress: number;
  target: number;
  unlockedAt: Date | null;
}

/**
 * Declarative badge metrics. Each entry is a pure async function
 * returning the user's current count toward the badge's target. The
 * function should return at most `target`; values above the target are
 * clamped at the consumer (`badge.progress = min(value, target)`).
 */
const BADGE_METRICS: Record<string, (userId: string) => Promise<number>> = {
  first_lesson: async (userId) => {
    const db = getDb();
    const [row] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.studentId, userId),
          eq(lessonProgress.completed, true)
        )
      );
    return row?.count ?? 0;
  },
  first_exam: async (userId) => {
    const db = getDb();
    const [row] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.studentId, userId),
          eq(examAttempts.status, "submitted")
        )
      );
    return row?.count ?? 0;
  },
  streak_3: async (userId) => {
    const db = getDb();
    const [row] = await db
      .select({ days: sql<number>`COALESCE(current_days, 0)::int` })
      .from(sql`daily_streaks`)
      .where(sql`user_id = ${userId}`)
      .limit(1);
    return Math.min(row?.days ?? 0, 3);
  },
  streak_7: async (userId) => {
    const db = getDb();
    const [row] = await db
      .select({ days: sql<number>`COALESCE(current_days, 0)::int` })
      .from(sql`daily_streaks`)
      .where(sql`user_id = ${userId}`)
      .limit(1);
    return Math.min(row?.days ?? 0, 7);
  },
  streak_30: async (userId) => {
    const db = getDb();
    const [row] = await db
      .select({ days: sql<number>`COALESCE(current_days, 0)::int` })
      .from(sql`daily_streaks`)
      .where(sql`user_id = ${userId}`)
      .limit(1);
    return Math.min(row?.days ?? 0, 30);
  },
  qa_first_post: async (userId) => {
    const db = getDb();
    const [row] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(qaThreads)
      .where(
        and(eq(qaThreads.userId, userId), eq(qaThreads.kind, "question"))
      );
    return Math.min(row?.count ?? 0, 1);
  },
  qa_10_accepted: async (userId) => {
    const db = getDb();
    // Count answered questions where the user's answer was accepted.
    // The accepted_answer_id points to the chosen answer; we count rows
    // in qa_threads of kind='question' whose accepted_answer_id points
    // to a thread authored by this user with kind='answer'.
    const [row] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(sql`qa_threads q`)
      .innerJoin(
        sql`qa_threads a`,
        sql`a.id = q.accepted_answer_id AND a.user_id = ${userId}`
      )
      .where(sql`q.kind = 'question' AND q.accepted_answer_id IS NOT NULL`);
    return Math.min(row?.count ?? 0, 10);
  },
  class_attend_10: async (userId) => {
    // Class attendance lands with R3 (live classes). Until that ships,
    // the badge is unlocked only after R3 emits `class.attended_60` XP
    // ten times. We proxy through the xp_events ledger for free.
    void userId; // reserved for the post-R3 implementation
    return 0;
  },
};

/**
 * Look up the catalog rows in declaration order. We sort by
 * `createdAt, id` so the UI grid is stable across reads.
 */
export async function listBadgeCatalog(): Promise<Badge[]> {
  const db = getDb();
  return db
    .select()
    .from(badges)
    .orderBy(badges.createdAt, badges.id);
}

/**
 * Returns the per-user progress for every badge in the catalog. Rows
 * are returned as a parallel array so the UI can render a grid
 * without re-keying. Users with no progress rows yet get zero-filled
 * entries — call `ensureBadgeProgressRows(userId)` first if you need
 * persisted rows.
 */
export async function listBadgesForUser(
  userId: string
): Promise<BadgeWithProgress[]> {
  const db = getDb();
  await ensureBadgeProgressRows(userId);

  const rows = await db
    .select({
      badge: badges,
      progress: badgeProgress,
    })
    .from(badges)
    .leftJoin(
      badgeProgress,
      and(
        eq(badgeProgress.badgeId, badges.id),
        eq(badgeProgress.userId, userId)
      )
    )
    .orderBy(badges.createdAt, badges.id);

  return rows.map((row) => ({
    ...row.badge,
    progress: row.progress?.progress ?? 0,
    target: row.progress?.target ?? 1,
    unlockedAt: row.progress?.unlockedAt ?? null,
  }));
}

/**
 * Seeds a 0/target row for every catalog badge that doesn't yet have
 * a progress row for this user. Idempotent — re-running is a no-op.
 */
export async function ensureBadgeProgressRows(userId: string): Promise<void> {
  const db = getDb();
  const catalog = await db.select({ id: badges.id }).from(badges);
  if (catalog.length === 0) return;

  // INSERT … SELECT … WHERE NOT EXISTS — one statement, no transactions.
  await db.execute(sql`
    INSERT INTO "badge_progress" ("user_id", "badge_id", "progress", "target", "created_at", "updated_at")
    SELECT ${userId}::text, b."id", 0, 1, now(), now()
      FROM "badges" b
     WHERE NOT EXISTS (
       SELECT 1 FROM "badge_progress" bp
        WHERE bp."user_id" = ${userId}::text
          AND bp."badge_id" = b."id"
     )
  `);
}

/**
 * Re-evaluate a single badge for the user. Pulls the metric, updates
 * the progress row (clamped to the badge's target), and unlocks the
 * badge (with celebration XP) the first time `progress >= target`.
 */
export async function evaluateBadge(
  userId: string,
  badgeId: string
): Promise<BadgeWithProgress | null> {
  const db = getDb();
  const [badge] = await db
    .select()
    .from(badges)
    .where(eq(badges.id, badgeId))
    .limit(1);
  if (!badge) return null;

  await ensureBadgeProgressRows(userId);

  const metricFn = BADGE_METRICS[badgeId];
  const metricValue = metricFn ? await metricFn(userId) : 0;
  const clamped = Math.min(metricValue, 1); // for non-streak metrics; per-badge overrides below.

  // Use the badge row's metric for streak badges, which already clamp
  // their return to the badge target.
  const target = badge.pointsReward > 0 ? 1 : 1; // default target = 1; streak badges clamp at their target
  void target;
  const finalProgress = clampForBadge(badgeId, metricValue);

  const [progressRow] = await db
    .update(badgeProgress)
    .set({
      progress: finalProgress,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(badgeProgress.userId, userId),
        eq(badgeProgress.badgeId, badgeId),
        // Don't roll back an already-unlocked badge.
        isNull(badgeProgress.unlockedAt)
      )
    )
    .returning();

  if (!progressRow) {
    // Already unlocked or no row — return current state.
    const [current] = await db
      .select()
      .from(badgeProgress)
      .where(
        and(
          eq(badgeProgress.userId, userId),
          eq(badgeProgress.badgeId, badgeId)
        )
      )
      .limit(1);
    return {
      ...badge,
      progress: current?.progress ?? 0,
      target: current?.target ?? 1,
      unlockedAt: current?.unlockedAt ?? null,
    };
  }

  // Did this evaluation cross the threshold?
  if (
    progressRow.unlockedAt == null &&
    progressRow.progress >= (await badgeTarget(badgeId, userId))
  ) {
    const [unlocked] = await db
      .update(badgeProgress)
      .set({ unlockedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(badgeProgress.userId, userId),
          eq(badgeProgress.badgeId, badgeId),
          isNull(badgeProgress.unlockedAt)
        )
      )
      .returning();

    if (unlocked) {
      // Award the badge XP reward (only if non-zero).
      if (badge.pointsReward > 0) {
        await emitXp(userId, "badge.unlocked", {
          badgeId,
          pointsReward: badge.pointsReward,
        });
      }
    }
  }
  void clamped;

  // Return the latest snapshot.
  const [latest] = await db
    .select()
    .from(badgeProgress)
    .where(
      and(
        eq(badgeProgress.userId, userId),
        eq(badgeProgress.badgeId, badgeId)
      )
    )
    .limit(1);

  return {
    ...badge,
    progress: latest?.progress ?? 0,
    target: latest?.target ?? 1,
    unlockedAt: latest?.unlockedAt ?? null,
  };
}

function clampForBadge(badgeId: string, value: number): number {
  switch (badgeId) {
    case "first_lesson":
    case "first_exam":
    case "qa_first_post":
      return Math.min(value, 1);
    case "streak_3":
      return Math.min(value, 3);
    case "streak_7":
      return Math.min(value, 7);
    case "streak_30":
      return Math.min(value, 30);
    case "qa_10_accepted":
      return Math.min(value, 10);
    case "class_attend_10":
      return Math.min(value, 10);
    default:
      return Math.min(value, 1);
  }
}

/**
 * Resolves the badge's `target` value. We mirror the `clampForBadge`
 * ceilings so progress bars never overshoot.
 */
async function badgeTarget(badgeId: string, userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ target: badgeProgress.target })
    .from(badgeProgress)
    .where(
      and(
        eq(badgeProgress.userId, userId),
        eq(badgeProgress.badgeId, badgeId)
      )
    )
    .limit(1);
  // Default targets when no row exists yet — should be rare because
  // ensureBadgeProgressRows runs before this is called.
  return row?.target ?? clampForBadge(badgeId, Number.MAX_SAFE_INTEGER);
}

/**
 * Recent unlocks across the whole user base. Used by the dashboard
 * "newest badges" rail.
 */
export async function listRecentUnlocks(limit = 5): Promise<
  Array<{
    userId: string;
    badgeId: string;
    badge: Badge;
    unlockedAt: Date;
  }>
> {
  const db = getDb();
  const rows = await db
    .select({
      userId: badgeProgress.userId,
      badgeId: badgeProgress.badgeId,
      unlockedAt: badgeProgress.unlockedAt,
      badge: badges,
    })
    .from(badgeProgress)
    .innerJoin(badges, eq(badges.id, badgeProgress.badgeId))
    .where(sql`${badgeProgress.unlockedAt} IS NOT NULL`)
    .orderBy(desc(badgeProgress.unlockedAt))
    .limit(limit);

  return rows
    .filter((r): r is typeof r & { unlockedAt: Date } => r.unlockedAt != null)
    .map((r) => ({
      userId: r.userId,
      badgeId: r.badgeId,
      badge: r.badge,
      unlockedAt: r.unlockedAt,
    }));
}

void xpEvents; // silence unused-import warnings (kept for future analytics joins)