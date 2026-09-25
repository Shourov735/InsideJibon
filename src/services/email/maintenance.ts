import "server-only";
import { lt, eq, and, gte } from "drizzle-orm";

import { getDb } from "@/db";
import { emailSendLog } from "@/db/schema";

/**
 * R10 — Daily email-log maintenance.
 *
 * Two jobs, both kicked off by the existing `proctor-purge` cron (the
 * 5-slot Cloudflare Workers Free plan limit means we cannot add a new
 * cron trigger; see wrangler.jsonc). The cron handler runs them as a
 * single transaction-free batch:
 *
 *   1. `purgeOldEmailLogEntries({ olderThanDays: 90 })` — keep the
 *      audit log bounded; 90 days is the documented retention in
 *      phase R10 §5.
 *   2. `countSendsLast24Hours()` — used by the same cron to emit an
 *      operator alert when the daily send count approaches 70
 *      (FREE-TIER-REFERENCE §7 / §19).
 *
 * Both jobs are idempotent — a second invocation within the same day
 * finds nothing left to delete and the counter just refreshes.
 */

export async function purgeOldEmailLogEntries(input: {
  olderThanDays?: number;
}): Promise<{ deleted: number; olderThanDays: number }> {
  const db = getDb();
  const days = input.olderThanDays ?? 90;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await db
    .delete(emailSendLog)
    .where(lt(emailSendLog.createdAt, cutoff))
    .returning({ id: emailSendLog.id });
  return { deleted: result.length, olderThanDays: days };
}

export async function countSendsLast24Hours(): Promise<{
  sent: number;
  failed: number;
  suppressed: number;
  total: number;
}> {
  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  // Sum across status buckets in a single pass. Neon HTTP has no
  // transactions, so we run four independent SELECTs.
  const [sent] = await db
    .select({ id: emailSendLog.id })
    .from(emailSendLog)
    .where(
      and(eq(emailSendLog.status, "sent"), gte(emailSendLog.createdAt, since))
    );
  const [failed] = await db
    .select({ id: emailSendLog.id })
    .from(emailSendLog)
    .where(
      and(
        eq(emailSendLog.status, "failed"),
        gte(emailSendLog.createdAt, since)
      )
    );
  const [suppressed] = await db
    .select({ id: emailSendLog.id })
    .from(emailSendLog)
    .where(
      and(
        eq(emailSendLog.status, "suppressed"),
        gte(emailSendLog.createdAt, since)
      )
    );
  const sentN = sent ? 1 : 0;
  const failedN = failed ? 1 : 0;
  const suppressedN = suppressed ? 1 : 0;
  return {
    sent: sentN,
    failed: failedN,
    suppressed: suppressedN,
    total: sentN + failedN + suppressedN,
  };
}

/**
 * Free-tier guard. Returns `true` if we should alert the operator that
 * the daily send quota is approaching. Threshold matches FREE-TIER-
 * REFERENCE §19 (Email Service sends: 70 / day alert).
 */
export async function isQuotaAtRisk(threshold = 70): Promise<boolean> {
  const { sent } = await countSendsLast24Hours();
  return sent >= threshold;
}
