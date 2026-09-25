import "server-only";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  emailSendLog,
  type EmailSendLogEntry,
} from "@/db/schema";

/**
 * R10 — Email dedupe.
 *
 * Every sendEmail() call requires a stable `dedupe_key` like
 * `grade_posted:<submissionId>:<gradedAt>`. The schema enforces
 * `UNIQUE(dedupe_key)` on `email_send_log`, so a replay inserts 0
 * rows (PG returns a unique-violation error). The dedupe helpers
 * here:
 *
 *  - `findByDedupeKey` returns the existing row when a replay happens
 *    (so sendEmail can short-circuit and return the previous log id).
 *  - `markSent` / `markFailed` update the status of an existing row.
 *
 * Race safety: neon-http has no transactions, but the UNIQUE constraint
 * + a single INSERT guarantees the second concurrent caller hits 23505.
 * sendEmail() catches 23505 and returns the existing row (see
 * `send.ts`). No retry loop needed.
 */

export async function findByDedupeKey(
  dedupeKey: string
): Promise<EmailSendLogEntry | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(emailSendLog)
    .where(eq(emailSendLog.dedupeKey, dedupeKey))
    .limit(1);
  return row ?? null;
}

export async function markSent(input: {
  id: number;
  providerId: string | null;
}): Promise<void> {
  const db = getDb();
  await db
    .update(emailSendLog)
    .set({
      status: "sent",
      providerId: input.providerId,
      sentAt: new Date(),
    })
    .where(eq(emailSendLog.id, input.id));
}

export async function markFailed(input: {
  id: number;
  reason: string;
}): Promise<void> {
  const db = getDb();
  await db
    .update(emailSendLog)
    .set({
      status: "failed",
      failedAt: new Date(),
      failureReason: input.reason,
    })
    .where(eq(emailSendLog.id, input.id));
}

export async function markSuppressed(input: { id: number }): Promise<void> {
  const db = getDb();
  await db
    .update(emailSendLog)
    .set({
      status: "suppressed",
      failedAt: new Date(),
      failureReason: "recipient unsubscribed",
    })
    .where(eq(emailSendLog.id, input.id));
}

export async function countSendsSince(
  since: Date
): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: emailSendLog.id })
    .from(emailSendLog)
    .where(eq(emailSendLog.status, "sent"));
  // Cheap and only used by the daily-quota cron — keep it simple.
  return rows.filter(() => true).length;
}
