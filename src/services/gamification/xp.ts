import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { xpEvents, type XpEvent } from "@/db/schema";
import { emitXp } from "@/services/xp/emit";

/**
 * R5 — Gamification orchestrator.
 *
 * Wraps `emitXp` with streak-side-effects. The earn paths in the rest
 * of the app call `emitGamifiedXp(...)` instead of `emitXp` directly:
 * one call records the XP, bumps the daily streak, and re-evaluates
 * the badge metrics that the source might affect.
 *
 * Per-day dedupe: lesson.complete is the only source that fires more
 * than once per user per day in practice. We pass `dedupeKey:
 * lesson:{lessonId}` so repeated completions don't double-count.
 */

export interface GamifiedXpResult {
  event: XpEvent | null;
  /** True if this call also advanced the streak day. */
  streakAdvanced: boolean;
}

/**
 * Records an XP event AND the streak side-effect, returning enough
 * state for the UI to surface a toast. The streak advancement is
 * fired only when the user has not yet recorded activity today.
 */
export async function emitGamifiedXp(
  userId: string,
  source: Parameters<typeof emitXp>[1],
  context: Record<string, unknown> = {},
  options: { dedupeKey?: string } = {}
): Promise<GamifiedXpResult> {
  const event = await emitXp(userId, source, context, options);

  // Streak only fires once per UTC day. We check the streak row
  // cheaply; the actual mutation is owned by `recordActivity`.
  let streakAdvanced = false;
  if (event && isStreakEligible(source)) {
    const { recordActivity } = await import("./streaks");
    const result = await recordActivity(userId);
    streakAdvanced = result.currentDays > 0;
  }

  // Re-evaluate badges that this XP source might affect. The list is
  // hand-curated — adding new earn paths means adding badge IDs here.
  const badgeIds = badgesForSource(source);
  if (badgeIds.length > 0) {
    const { evaluateBadge } = await import("./badges");
    await Promise.all(
      badgeIds.map((id) =>
        evaluateBadge(userId, id).catch((err) => {
          // Badge eval is best-effort; never break the parent action.
          console.error("badge eval failed", { userId, id, err });
        })
      )
    );
  }

  return { event, streakAdvanced };
}

function isStreakEligible(source: Parameters<typeof emitXp>[1]): boolean {
  // Streak fires for *any* earning event except a streak.day
  // re-trigger from the streak service itself.
  return source !== "streak.day" && source !== "streak.week";
}

function badgesForSource(source: Parameters<typeof emitXp>[1]): string[] {
  switch (source) {
    case "lesson.complete":
      return ["first_lesson", "streak_3", "streak_7", "streak_30"];
    case "exam.passed":
    case "exam.perfect":
      return ["first_exam", "streak_3", "streak_7", "streak_30"];
    case "qa.accepted":
      return ["qa_10_accepted", "streak_3", "streak_7", "streak_30"];
    case "assignment.graded_a":
    case "assignment.submitted_ontime":
      return ["streak_3", "streak_7", "streak_30"];
    case "class.attended_60":
      return ["class_attend_10", "streak_3", "streak_7", "streak_30"];
    default:
      return [];
  }
}

/**
 * Sum of XP earned by the user within `range` (default: all time).
 * Used by the streak/XP card on the dashboard right rail.
 */
export async function getXpTotal(
  userId: string,
  range?: { since: Date }
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ sum: sql<number>`COALESCE(SUM(${xpEvents.amount}), 0)::int` })
    .from(xpEvents)
    .where(
      range
        ? and(eq(xpEvents.userId, userId), gte(xpEvents.createdAt, range.since))
        : eq(xpEvents.userId, userId)
    );
  return row?.sum ?? 0;
}

/**
 * XP grouped by source for the user within `range`. Useful for the
 * analytics dashboard in a later phase; exposed now for completeness.
 */
export async function getXpBreakdown(
  userId: string,
  range?: { since: Date }
): Promise<Array<{ source: string; amount: number; count: number }>> {
  const db = getDb();
  const rows = await db
    .select({
      source: xpEvents.source,
      amount: sql<number>`COALESCE(SUM(${xpEvents.amount}), 0)::int`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(xpEvents)
    .where(
      range
        ? and(eq(xpEvents.userId, userId), gte(xpEvents.createdAt, range.since))
        : eq(xpEvents.userId, userId)
    )
    .groupBy(xpEvents.source)
    .orderBy(sql`SUM(${xpEvents.amount}) DESC`);
  return rows;
}