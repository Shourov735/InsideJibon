import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { xpEvents, xpSources, type XpEvent } from "@/db/schema";

import { XP_AMOUNTS, type XpSource } from "./sources";

/**
 * Emit a single XP event into the ledger.
 *
 * R4 owned this helper; R5 makes the *amount* data-driven. We look up
 * `xp_sources.default_amount` on each emission so changing a reward
 * amount in the database doesn't require a redeploy. If the source row
 * is missing (cold deploy, registry not yet seeded, source disabled),
 * we fall back to the in-code `XP_AMOUNTS` constant — this keeps the
 * Q&A paths from R4 working even on a partially-migrated DB.
 *
 * Idempotency: a per-(userId, source, dedupeKey) check inside this
 * function prevents the same context from emitting twice. Callers that
 * already deduplicate at the action layer (vote counters, accept-answer
 * transitions) can omit the `dedupeKey`; callers that don't (lesson
 * completion on a `markComplete` toggle) should pass a stable key like
 * `lesson:{lessonId}` so re-clicks don't inflate XP.
 *
 * Note: we don't wrap this in a transaction (Neon HTTP driver has no
 * transactions). XP is a derived reward; if the insert fails, the user
 * loses the +5/+25 but the underlying action (vote/accept/complete) is
 * preserved. Acceptable trade-off: the leaderboard snapshot is
 * recomputed every 2 hours, so any transient miss is amortized.
 */
export async function emitXp(
  userId: string,
  source: XpSource,
  context: Record<string, unknown> = {},
  options: { dedupeKey?: string } = {}
): Promise<XpEvent | null> {
  try {
    const db = getDb();
    const { dedupeKey } = options;

    // Idempotency guard: if a dedupeKey is provided and an event for
    // this (user, source, key) already exists, no-op.
    if (dedupeKey) {
      const existing = await db
        .select({ id: xpEvents.id })
        .from(xpEvents)
        .where(
          and(
            eq(xpEvents.userId, userId),
            eq(xpEvents.source, source),
            sql`${xpEvents.context} ->> 'dedupeKey' = ${dedupeKey}`
          )
        )
        .limit(1);
      if (existing.length > 0) return null;
    }

    const amount = await resolveAmount(source);
    if (amount <= 0) return null; // disabled source or no reward.

    const contextWithKey = dedupeKey
      ? { ...context, dedupeKey }
      : context;

    const [row] = await db
      .insert(xpEvents)
      .values({
        userId,
        source,
        amount,
        context: contextWithKey,
      })
      .returning();
    return row ?? null;
  } catch (error) {
    // Don't let XP bookkeeping break the parent action.
    console.error("emitXp failed", { userId, source, error });
    return null;
  }
}

/**
 * Resolves the canonical award amount for a source. Reads from
 * `xp_sources.default_amount` (data-driven), falling back to the
 * in-code constant if the source row is missing or disabled.
 */
async function resolveAmount(source: XpSource): Promise<number> {
  const fallback = XP_AMOUNTS[source] ?? 0;
  try {
    const db = getDb();
    const [row] = await db
      .select({ amount: xpSources.defaultAmount, enabled: xpSources.enabled })
      .from(xpSources)
      .where(eq(xpSources.sourceKey, source))
      .limit(1);
    if (!row) return fallback;
    if (!row.enabled) return 0;
    return row.amount;
  } catch {
    // DB unreachable — fall back to the compile-time amount so callers
    // never lose an action because the gamification table is offline.
    return fallback;
  }
}

/**
 * Convenience wrapper for the most common Q&A emitter: a single upvote
 * received. The caller (vote handler) is responsible for the
 * compare-and-swap on `qa_threads.upvotes`; this just records the XP.
 */
export async function emitQaUpvoteXp(
  threadAuthorId: string,
  voterId: string,
  threadId: string,
  value: 1 | -1
): Promise<void> {
  // Authors don't get XP for voting on their own thread.
  if (threadAuthorId === voterId) return;
  // Downvotes don't grant XP — only upvotes do. (We still record the
  // vote so the QA ledger stays consistent; the XP layer just stays
  // quiet on the -1 path.)
  if (value !== 1) return;
  await emitXp(
    threadAuthorId,
    "qa.upvote",
    { threadId, voterId },
    { dedupeKey: `upvote:${threadId}:${voterId}` }
  );
}

export async function emitQaAcceptedXp(
  answerAuthorId: string,
  questionAuthorId: string,
  threadId: string,
  answerId: string
): Promise<void> {
  // Author can't accept their own answer for XP.
  if (answerAuthorId === questionAuthorId) return;
  await emitXp(
    answerAuthorId,
    "qa.accepted",
    { threadId, answerId, questionAuthorId },
    { dedupeKey: `accept:${answerId}` }
  );
}