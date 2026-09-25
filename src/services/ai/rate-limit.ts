import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "@/db";
import { aiTutorUsage } from "@/db/schema";
import { rateLimit } from "@/services/security/rate-limit";

/**
 * R8 §3.5 step 2 + R8 §5 — AI tutor rate limit.
 *
 * Two layers:
 *
 *   1. KV sliding-window (RATE_LIMIT_CONFIG["ai.tutor.ask"] — 20
 *      hits / 60s). This is the short-term burst guard. It catches
 *      tight loops but does NOT enforce the per-day Neon counter —
 *      that's layer 2.
 *
 *   2. Postgres daily counter (`ai_tutor_usage` — 20 Q / user / day).
 *      Bumped via an atomic UPSERT (Neon HTTP has no transactions,
 *      so we rely on the composite PK + onConflictDoUpdate). This is
 *      the authoritative per-day ceiling.
 *
 * The function returns `remaining` AFTER incrementing, and `ok: false`
 * only when the daily ceiling is reached — KV exhaustion returns
 * `ok: false` from `rateLimit()` directly.
 */

export const R8_DAILY_LIMIT = 20;

export type TutorRateLimit = {
  ok: boolean;
  remaining: number;
  resetSec: number;
  reason?: "burst" | "daily" | "budget";
};

/**
 * Check the 60s burst limit (existing R0 KV bucket). Returns a decision
 * or null to signal "skip the burst check, the daily ceiling is the
 * active guard".
 */
export async function checkBurst(userId: string): Promise<TutorRateLimit | null> {
  const decision = await rateLimit("ai.tutor.ask", userId);
  if (decision.ok) return null;
  return {
    ok: false,
    remaining: 0,
    resetSec: decision.resetSec,
    reason: "burst",
  };
}

/**
 * Atomic daily-counter check + increment.
 *
 * Single round-trip via UPSERT on the (user_id, usage_day) PK:
 *   - If the row exists, bump `questions` and re-read.
 *   - If it doesn't, insert with questions=1.
 *
 * Returns the post-increment decision. When the day rolls over the
 * counter resets automatically (usage_day mismatches the PK).
 */
export async function incrementDailyCounter(
  userId: string,
  now: Date = new Date()
): Promise<TutorRateLimit> {
  const db = getDb();
  const usageDay = formatUsageDay(now);

  // Postgres DATE comparison is timezone-dependent. Neon is UTC by
  // default; we send a string so Drizzle doesn't try to coerce.
  const [row] = await db
    .insert(aiTutorUsage)
    .values({
      userId,
      usageDay,
      questions: 1,
    })
    .onConflictDoUpdate({
      target: [aiTutorUsage.userId, aiTutorUsage.usageDay],
      set: {
        questions: sql`${aiTutorUsage.questions} + 1`,
      },
    })
    .returning({ questions: aiTutorUsage.questions });

  const count = row?.questions ?? 0;
  if (count > R8_DAILY_LIMIT) {
    return {
      ok: false,
      remaining: 0,
      // Seconds until midnight UTC — the upper bound for "reset".
      resetSec: secondsUntilUtcMidnight(now),
      reason: "daily",
    };
  }
  return {
    ok: true,
    remaining: R8_DAILY_LIMIT - count,
    resetSec: secondsUntilUtcMidnight(now),
  };
}

/**
 * Read-only peek for the tutor side sheet UI ("17 of 20 questions left
 * today"). Does NOT consume a slot.
 */
export async function peekDailyCounter(
  userId: string,
  now: Date = new Date()
): Promise<TutorRateLimit> {
  const db = getDb();
  const usageDay = formatUsageDay(now);
  const [row] = await db
    .select({ questions: aiTutorUsage.questions })
    .from(aiTutorUsage)
    .where(
      sql`${aiTutorUsage.userId} = ${userId} AND ${aiTutorUsage.usageDay} = ${usageDay}::date`
    )
    .limit(1);
  const count = row?.questions ?? 0;
  const remaining = Math.max(0, R8_DAILY_LIMIT - count);
  return {
    ok: remaining > 0,
    remaining,
    resetSec: secondsUntilUtcMidnight(now),
  };
}

function formatUsageDay(d: Date): string {
  // ISO date in UTC: YYYY-MM-DD. Postgres `DATE` accepts this.
  return d.toISOString().slice(0, 10);
}

function secondsUntilUtcMidnight(now: Date): number {
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}

/**
 * Convenience wrapper used by the tutor endpoint: runs the burst check
 * AND the daily-counter increment in the right order. On rejection by
 * the burst check we skip the daily increment so the user doesn't
 * waste a slot on a request that won't be served.
 */
export async function consumeTutorSlot(
  userId: string,
  now: Date = new Date()
): Promise<TutorRateLimit> {
  const burst = await checkBurst(userId);
  if (burst) return burst;
  return incrementDailyCounter(userId, now);
}
