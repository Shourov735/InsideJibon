import "server-only";

import { and, eq, lt, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { userEnergy, type UserEnergy } from "@/db/schema";

/**
 * R5 — Energy / lives service.
 *
 * One row per user. Default 5 hearts. The cron tick grants +1 every
 * 30 minutes when `now() >= next_refill_at`, capped at `max_energy`.
 *
 * Concurrency: each tick uses a conditional UPDATE keyed on
 * `next_refill_at` so two parallel ticks can't double-credit.
 */

const REFILL_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Reads the current energy row, returning a zeroed default when none
 * exists yet.
 */
export async function getEnergy(userId: string): Promise<UserEnergy | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(userEnergy)
    .where(eq(userEnergy.userId, userId))
    .limit(1);
  return row ?? null;
}

/**
 * Atomically consumes `n` energy if the user has enough. Returns the
 * new energy level, or null if the user couldn't afford it.
 *
 * The exam/quiz start path should check this BEFORE running an
 * attempt — if `n` is 0 the loop short-circuits. For R5 we expose the
 * API but only the streak-repair modal's "refill now" button uses it
 * directly; per-exam `costPerAttempt` wiring lands in a later phase.
 */
export async function consumeEnergy(
  userId: string,
  n: number = 1,
  now: Date = new Date()
): Promise<{ energy: number; consumed: boolean } | null> {
  if (n <= 0) return { energy: 0, consumed: true };
  const db = getDb();

  // Ensure the row exists. ON CONFLICT DO NOTHING so concurrent first
  // callers don't race — the loser observes the winner's row.
  await db
    .insert(userEnergy)
    .values({ userId })
    .onConflictDoNothing({ target: userEnergy.userId });

  const [updated] = await db
    .update(userEnergy)
    .set({
      energy: sql`GREATEST(0, ${userEnergy.energy} - ${n})`,
      updatedAt: now,
    })
    .where(
      and(
        eq(userEnergy.userId, userId),
        sql`${userEnergy.energy} >= ${n}`
      )
    )
    .returning({ energy: userEnergy.energy });

  if (!updated) {
    return null;
  }
  return { energy: updated.energy, consumed: true };
}

/**
 * Refill tick — grant +1 to every user whose `next_refill_at` has
 * elapsed, capped at `max_energy`. Returns the count of users
 * credited. Designed to be called every 5 minutes by a cron trigger.
 */
export async function refillTick(now: Date = new Date()): Promise<number> {
  const db = getDb();
  const updated = await db
    .update(userEnergy)
    .set({
      energy: sql`LEAST(${userEnergy.maxEnergy}, ${userEnergy.energy} + 1)`,
      nextRefillAt: sql`${now.toISOString()}::timestamptz + INTERVAL '30 minutes'`,
      updatedAt: now,
    })
    .where(lt(userEnergy.nextRefillAt, now))
    .returning({ userId: userEnergy.userId });

  return updated.length;
}

/**
 * Best-effort "refill now" action for teachers / inventory grants.
 * Sets the row to `maxEnergy` and pushes the next refill into the
 * future by 30 minutes. Idempotent.
 */
export async function refillNow(
  userId: string,
  now: Date = new Date()
): Promise<UserEnergy | null> {
  const db = getDb();
  const nextRefillAt = new Date(now.getTime() + REFILL_INTERVAL_MS);
  const [row] = await db
    .insert(userEnergy)
    .values({ userId, nextRefillAt })
    .onConflictDoUpdate({
      target: userEnergy.userId,
      set: {
        energy: sql`${userEnergy.maxEnergy}`,
        nextRefillAt,
        updatedAt: now,
      },
    })
    .returning();
  return row ?? null;
}