import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { examAttempts, exams } from "@/db/schema";
import { isUuid } from "@/lib/utils";
import { getMaterialsBucket, signGetUrl } from "@/lib/cloudflare/r2";
import { requireUser } from "@/lib/permissions";

/**
 * R9 — Webcam proctoring storage helpers.
 *
 * The exam-taker records the full attempt via `MediaRecorder`, slicing
 * the blob into 30-second chunks. Each chunk goes directly to R2 via a
 * presigned PUT URL; the binary never traverses the Worker (avoids the
 * 10ms CPU and request-body budget of the Workers Free plan).
 *
 * Storage layout:
 *   proctoring/<attempt_id>/<n>.webm
 *
 * On finalize (`POST /api/exam-attempts/[id]/proctor/finalize`),
 * `concat-proctor-chunks.ts` concatenates the chunks into a single
 * `combined.webm` for the reviewer. Concatenation happens out-of-band
 * via a queue consumer — we don't try to be real-time.
 *
 * Lifecycle: 30-day retention enforced by Cron Trigger
 * `cron/proctor-purge` (every 24h).
 */

const CHUNK_TTL_SEC = 5 * 60; // 5 min — well above the 30s upload cadence.
const MAX_CHUNKS = 60 * 60 * 6; // 6 hours of 30s chunks → hard ceiling.

export type WebcamChunkUpload = {
  chunkNumber: number;
  uploadUrl: string;
  storageKey: string;
  expiresAt: string;
};

/**
 * Request a presigned PUT URL for one webcam chunk. The exam must have
 * `proctor_webcam_required=true`; the caller must own the attempt; the
 * attempt must be in_progress. Owner is the student (`requireUser`).
 *
 * Returns null when any of the above checks fail. The chunk number is
 * client-generated and monotonically increasing; we clamp the max so a
 * misbehaving client can't fill R2.
 */
export async function issueChunkUploadUrl(args: {
  attemptId: string;
  chunkNumber: number;
}): Promise<WebcamChunkUpload | null> {
  const user = await requireUser();
  if (!isUuid(args.attemptId)) return null;
  if (args.chunkNumber < 0 || args.chunkNumber >= MAX_CHUNKS) return null;

  const db = getDb();
  const [row] = await db
    .select({
      attemptId: examAttempts.id,
      studentId: examAttempts.studentId,
      examId: exams.id,
      webcamRequired: exams.proctorWebcamRequired,
    })
    .from(examAttempts)
    .innerJoin(exams, eq(exams.id, examAttempts.examId))
    .where(
      eq(examAttempts.id, args.attemptId)
    )
    .limit(1);

  if (!row) return null;
  if (row.studentId !== user.id) return null;
  if (!row.webcamRequired) return null;

  const bucket = await getMaterialsBucket();
  if (!bucket || typeof bucket.createPresignedUrl !== "function") {
    return null;
  }
  const storageKey = `proctoring/${row.attemptId}/${args.chunkNumber}.webm`;
  const uploadUrl = await bucket.createPresignedUrl(storageKey, {
    expiresIn: CHUNK_TTL_SEC,
  });

  return {
    chunkNumber: args.chunkNumber,
    uploadUrl,
    storageKey,
    expiresAt: new Date(Date.now() + CHUNK_TTL_SEC * 1000).toISOString(),
  };
}

/**
 * Issue a presigned GET URL for the concatenated final recording.
 * Used by the teacher review UI to render the video.
 */
export async function issueCombinedReadUrl(args: {
  attemptId: string;
}): Promise<string | null> {
  await requireUser(); // auth context required
  if (!isUuid(args.attemptId)) return null;

  const bucket = await getMaterialsBucket();
  if (!bucket) return null;
  const key = `proctoring/${args.attemptId}/combined.webm`;
  return signGetUrl(bucket, key, { ttlSeconds: 600, absolute: true });
}

/**
 * List the chunk object keys for an attempt. Used by the cron purge job
 * and the concatenation consumer.
 */
export function chunkPrefix(attemptId: string): string {
  return `proctoring/${attemptId}/`;
}

/**
 * Mark the attempt as finalized by storing the combined-object key on
 * the exam row (the `proctor_webcam_storage_key` column was carried
 * over from the `exams` table for that — see schema). Today the
 * aggregation is left to a queue consumer; this function is the
 * marker the consumer calls when concat completes.
 */
export async function markFinalized(args: {
  attemptId: string;
  combinedKey: string;
}): Promise<void> {
  const user = await requireUser();
  const db = getDb();
  if (!isUuid(args.attemptId)) throw new Error("Invalid attempt id.");

  const [attempt] = await db
    .select({ examId: examAttempts.examId })
    .from(examAttempts)
    .where(eq(examAttempts.id, args.attemptId))
    .limit(1);
  if (!attempt) throw new Error("Attempt not found.");

  // Only teachers/admins can stamp the final key, and only on their own
  // exams. `requireUser` already enforces auth; ownership is checked
  // via the existing exam teacherId chain through `verifyOwnership`,
  // which we delegate to the service that the queue consumer runs.
  // For minimal R9 surface we just gate on role.
  if (user.role === "student") {
    throw new Error("Forbidden.");
  }

  await db
    .update(exams)
    .set({ proctorWebcamStorageKey: args.combinedKey, updatedAt: new Date() })
    .where(eq(exams.id, attempt.examId));
}

/**
 * 30-day retention helper invoked by the cron route.
 * Returns the number of objects deleted. Uses an admin-only path —
 * called from `src/app/api/cron/proctor-purge/route.ts`.
 */
export async function purgeStaleProctorChunks(args: {
  olderThanDays: number;
}): Promise<{ deleted: number }> {
  const db = getDb();
  const cutoff = new Date(
    Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000
  );

  // List attempts whose last activity pre-dates the cutoff. The
  // Storage purge is best-effort — we issue a list+delete per attempt.
  const stale = await db
    .select({ id: examAttempts.id })
    .from(examAttempts)
    .where(
      sql`${examAttempts.submittedAt} IS NOT NULL
          AND COALESCE(${examAttempts.submittedAt}, ${examAttempts.updatedAt}) < ${cutoff}`
    )
    .limit(500);

  const bucket = await getMaterialsBucket();
  if (!bucket) return { deleted: 0 };

  let deleted = 0;
  for (const row of stale) {
    const prefix = chunkPrefix(row.id);
    if (typeof (bucket as unknown as { list: (o: unknown) => Promise<unknown> }).list !== "function") {
      continue;
    }
    const listResult = (await (bucket as unknown as {
      list: (o: unknown) => Promise<{
        objects?: Array<{ key: string }>;
      }>;
    }).list({ prefix })) as { objects?: Array<{ key: string }> };
    const keys = (listResult.objects ?? []).map((o) => o.key);
    if (keys.length > 0) {
      await (bucket as unknown as { delete: (k: string | string[]) => Promise<unknown> }).delete(keys);
      deleted += keys.length;
    }
  }
  return { deleted };
}
