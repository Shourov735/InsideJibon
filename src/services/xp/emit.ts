import "server-only";

import { getDb } from "@/db";
import { xpEvents, type XpEvent } from "@/db/schema";

import { XP_AMOUNTS, type XpSource } from "./sources";

/**
 * Emit a single XP event into the ledger.
 *
 * R4 owns this helper; R5 retrofits `lesson.complete` / `exam.pass` /
 * `streak.day` into the existing completion paths. The function is
 * idempotent at the call site — callers decide whether the action
 * already happened (e.g. accept-answer is a single transition; you don't
 * need to deduplicate here).
 *
 * Note: we don't wrap this in a transaction (Neon HTTP driver has no
 * transactions). XP is a derived reward; if the insert fails, the user
 * loses the +5/+25 but the underlying action (vote/accept) is preserved.
 * Acceptable trade-off: the leaderboard snapshot is recomputed every 2
 * hours, so any transient miss is amortized.
 */
export async function emitXp(
  userId: string,
  source: XpSource,
  context: Record<string, unknown> = {}
): Promise<XpEvent | null> {
  const amount = XP_AMOUNTS[source];
  if (!amount) return null; // R5 stub sources return 0; skip the insert.

  try {
    const db = getDb();
    const [row] = await db
      .insert(xpEvents)
      .values({
        userId,
        source,
        amount,
        context,
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
  await emitXp(threadAuthorId, "qa.upvote", { threadId, voterId });
}

export async function emitQaAcceptedXp(
  answerAuthorId: string,
  questionAuthorId: string,
  threadId: string,
  answerId: string
): Promise<void> {
  // Author can't accept their own answer for XP.
  if (answerAuthorId === questionAuthorId) return;
  await emitXp(answerAuthorId, "qa.accepted", {
    threadId,
    answerId,
    questionAuthorId,
  });
}
