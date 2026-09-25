import { NextResponse } from "next/server";

import { purgeStaleProctorChunks } from "@/services/proctoring/webcam";

/**
 * R9 — Cron Trigger: 30-day proctor chunk purge.
 *
 * Fires once a day via `wrangler.jsonc`'s `triggers.crons`. Lists
 * attempts whose last activity pre-dates 30 days, deletes the
 * per-attempt webcam chunks from R2 (free egress; deletion is the
 * only R2 op that costs Class A against the 10M/month free quota).
 *
 * Idempotency: each invocation deletes whatever's left — already
 * purged attempts have no chunks left to delete. The 500-row limit
 * keeps a single tick bounded under the 10ms CPU budget.
 */
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await purgeStaleProctorChunks({ olderThanDays: 30 });
    return NextResponse.json(
      { ok: true, ...result },
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
