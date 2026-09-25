import { NextResponse } from "next/server";

import { purgeStaleProctorChunks } from "@/services/proctoring/webcam";
import {
  purgeOldEmailLogEntries,
  isQuotaAtRisk,
  countSendsLast24Hours,
} from "@/services/email/maintenance";

/**
 * R9 — Cron Trigger: 30-day proctor chunk purge.
 *
 * Fires once a day via `wrangler.jsonc`'s `triggers.crons`. R10
 * folded two more jobs into the same tick to stay within the
 * Cloudflare Workers Free plan's 5-cron-trigger limit:
 *
 *   1. `purgeStaleProctorChunks` — R9's existing 30-day webcam purge.
 *   2. `purgeOldEmailLogEntries` — R10 90-day email-send-log purge.
 *   3. `isQuotaAtRisk` — R10 free-tier alert at 70 sends/24h.
 *
 * Each job is independent and idempotent. The handler returns a
 * JSON summary and sets `Cache-Control: no-store` so Cloudflare
 * never caches the response.
 */
export const runtime = "nodejs";

export async function GET() {
  try {
    const [proctorResult, emailPurge, sendCounts, quotaAlert] =
      await Promise.all([
        purgeStaleProctorChunks({ olderThanDays: 30 }),
        purgeOldEmailLogEntries({ olderThanDays: 90 }),
        countSendsLast24Hours(),
        isQuotaAtRisk(70),
      ]);

    if (quotaAlert) {
      // The alert is an in-app console.warn — the operator tails the
      // Workers log drain in production. Sending an email about the
      // quota would itself consume quota, so we deliberately surface
      // it via logs only.
      console.warn(
        "[r10-cron] email send quota at risk:",
        sendCounts.sent,
        "sent in last 24h"
      );
    }

    return NextResponse.json(
      {
        ok: true,
        proctor: proctorResult,
        emailPurge,
        sendCounts,
        quotaAlert,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Cron proctor-purge failed", error);
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
