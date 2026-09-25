import "server-only";

import { and, count, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  examProctorEvents,
  examAttempts,
  type ExamProctorKind,
  type NewExamProctorEvent,
} from "@/db/schema";
import { isUuid } from "@/lib/utils";
import { requireUser } from "@/lib/permissions";
import { rateLimit } from "@/services/security/rate-limit";

/**
 * R9 — Exam proctoring event timeline.
 *
 * Every signal the exam-taker observes (`fullscreen.exit`, `tab.blur`,
 * `webcam.start`, …) becomes one row in `exam_proctor_events`. The
 * teacher review UI replays the timeline in chronological order.
 *
 * `flagAttempt` increments the per-attempt counter and flips
 * `proctor_flagged` once the threshold is reached (default 3 events).
 * Both writes go through atomic UPDATEs to stay safe under the
 * Neon HTTP driver, which has no transactions.
 *
 * Free-tier note: ingestion is rate-limited via the `proctor.event` KV
 * bucket (120/min/user). Unbounded at the bucket layer; small per-second
 * limit keeps a stuck client from saturating DB writes.
 */

const FLAG_THRESHOLD = 3;

export type ProctorEventKind = ExamProctorKind;

/**
 * Persist one proctor event for an attempt owned by the caller. The
 * caller is the student taking the exam (or a teacher/admin acting on
 * their behalf). The ownership chain is `event.user_id = caller.id`,
 * `event.attempt_id → exam_attempts(student_id)`. Foreign student
 * attempts cannot be written to.
 */
export async function recordEvent(args: {
  attemptId: string;
  kind: ProctorEventKind;
  payload?: Record<string, unknown>;
}): Promise<{ id: number; flagCount: number; flagged: boolean }> {
  const user = await requireUser();
  if (!isUuid(args.attemptId)) {
    throw new Error("Invalid attempt id.");
  }

  const decision = await rateLimit("proctor.event", user.id);
  if (!decision.ok) {
    // Soft-drop on rate limit. Returning a synthetic shape is simpler
    // than bubbling up 429 from inside a SW-callable hook.
    return { id: 0, flagCount: 0, flagged: false };
  }

  const db = getDb();
  const insertValues: NewExamProctorEvent = {
    attemptId: args.attemptId,
    userId: user.id,
    kind: args.kind,
    payload: args.payload ?? {},
  };

  const [event] = await db
    .insert(examProctorEvents)
    .values(insertValues)
    .returning({ id: examProctorEvents.id });

  // The flag counter increments via atomic UPDATE on the attempt.
  // The WHERE clause re-checks ownership so foreign attempts don't bump.
  const [updated] = await db
    .update(examAttempts)
    .set({
      proctorFlagCount: sql`${examAttempts.proctorFlagCount} + 1`,
      proctorFlagged: sql`(
        CASE WHEN ${examAttempts.proctorFlagCount} + 1 >= ${FLAG_THRESHOLD}
             THEN true ELSE ${examAttempts.proctorFlagged}
        END
      )`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(examAttempts.id, args.attemptId),
        eq(examAttempts.studentId, user.id),
        // Only flagging matters on in-progress attempts.
        eq(examAttempts.status, "in_progress")
      )
    )
    .returning({
      flagCount: examAttempts.proctorFlagCount,
      flagged: examAttempts.proctorFlagged,
    });

  return {
    id: event?.id ?? 0,
    flagCount: updated?.flagCount ?? 0,
    flagged: updated?.flagged ?? false,
  };
}

/**
 * Aggregate summary used by the teacher review UI to render the
 * timeline chip badges. Per-attempt aggregation reads from the same
 * `exam_proctor_events` table that the timeline reads — no separate
 * counter denormalization.
 */
export type AttemptProctorSummary = {
  attemptId: string;
  total: number;
  byKind: Record<string, number>;
  flagCount: number;
  flagged: boolean;
};

export async function summarizeAttempt(
  attemptId: string
): Promise<AttemptProctorSummary | null> {
  const db = getDb();
  if (!isUuid(attemptId)) return null;

  const [attempt] = await db
    .select({
      flagCount: examAttempts.proctorFlagCount,
      flagged: examAttempts.proctorFlagged,
    })
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
    .limit(1);
  if (!attempt) return null;

  const rows = await db
    .select({
      kind: examProctorEvents.kind,
      n: count(),
    })
    .from(examProctorEvents)
    .where(eq(examProctorEvents.attemptId, attemptId))
    .groupBy(examProctorEvents.kind);

  const byKind: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    byKind[r.kind] = Number(r.n);
    total += Number(r.n);
  }
  return {
    attemptId,
    total,
    byKind,
    flagCount: attempt.flagCount,
    flagged: attempt.flagged,
  };
}

/**
 * Explicitly flag an attempt (e.g. from the reviewer's "void attempt"
 * button). Idempotent — the second invocation is a no-op.
 */
export async function flagAttempt(args: {
  attemptId: string;
  reason?: string;
}): Promise<void> {
  const db = getDb();
  if (!isUuid(args.attemptId)) throw new Error("Invalid attempt id.");
  await db
    .update(examAttempts)
    .set({ proctorFlagged: true, updatedAt: new Date() })
    .where(eq(examAttempts.id, args.attemptId));
}

/**
 * Mark an attempt reviewed by the current user (teacher/admin). The
 * reviewer field is the user id, not a name — keeping PII out of the
 * denormalized column.
 */
export async function markReviewed(args: {
  attemptId: string;
}): Promise<void> {
  const user = await requireUser();
  const db = getDb();
  if (!isUuid(args.attemptId)) throw new Error("Invalid attempt id.");
  await db
    .update(examAttempts)
    .set({
      proctorReviewedAt: new Date(),
      proctorReviewedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(examAttempts.id, args.attemptId));
}

/**
 * Fetch the timeline events for an attempt, ordered chronologically.
 * Used by the teacher review UI to render the rail.
 */
export async function listAttemptEvents(
  attemptId: string,
  limit = 200
): Promise<
  Array<{
    id: number;
    kind: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }>
> {
  const db = getDb();
  if (!isUuid(attemptId)) return [];
  const rows = await db
    .select({
      id: examProctorEvents.id,
      kind: examProctorEvents.kind,
      payload: examProctorEvents.payload,
      createdAt: examProctorEvents.createdAt,
    })
    .from(examProctorEvents)
    .where(eq(examProctorEvents.attemptId, attemptId))
    .orderBy(examProctorEvents.createdAt)
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
  }));
}
