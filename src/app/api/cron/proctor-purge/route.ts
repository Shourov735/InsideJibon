import { NextResponse } from "next/server";

import { purgeStaleProctorChunks } from "@/services/proctoring/webcam";
import {
  purgeOldEmailLogEntries,
  isQuotaAtRisk,
  countSendsLast24Hours,
} from "@/services/email/maintenance";
import { sendDailyDigests, sendWeeklyDigests } from "@/services/parent/digest";

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
 * R7 folded the parent digest fan-out into the same trigger:
 *   4. `sendDailyDigests`  — every day.
 *   5. `sendWeeklyDigests` — only on Mondays (dow=1 in UTC). The phase
 *      doc preferred 06:00 UTC; we already had R9 on 03:00 UTC and
 *      adding a sixth trigger is rejected by Cloudflare Free. The
 *      dispatch window is 3 hours earlier, well within Bangladeshi
 *      morning hours.
 *
 * Each job is independent and idempotent. The handler returns a
 * JSON summary and sets `Cache-Control: no-store` so Cloudflare
 * never caches the response.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const onlyDigest = url.searchParams.get("scope") === "digest";

    const today = new Date();
    const isMonday = today.getUTCDay() === 1;

    const [proctorResult, emailPurge, sendCounts, quotaAlert, dailyResult, weeklyResult] =
      await Promise.all([
        onlyDigest
          ? Promise.resolve({ scanned: 0, deleted: 0 })
          : purgeStaleProctorChunks({ olderThanDays: 30 }),
        onlyDigest
          ? Promise.resolve({ scanned: 0, deleted: 0 })
          : purgeOldEmailLogEntries({ olderThanDays: 90 }),
        onlyDigest
          ? Promise.resolve({ sent: 0, suppressed: 0, failed: 0 })
          : countSendsLast24Hours(),
        onlyDigest ? Promise.resolve(false) : isQuotaAtRisk(70),
        sendDailyDigests(),
        isMonday ? sendWeeklyDigests() : Promise.resolve(null),
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
        parentDigest: {
          daily: dailyResult,
          weekly: weeklyResult,
        },
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
