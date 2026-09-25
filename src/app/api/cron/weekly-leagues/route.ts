import { NextResponse } from "next/server";

import { computeWeeklyLeagues } from "@/services/gamification";

/**
 * R5 Cron Trigger — weekly league partition.
 *
 * Fires Sunday 23:59 UTC via `wrangler.jsonc`'s `triggers.crons`. Reads
 * the *previous week's* XP totals, ranks users, partitions into
 * Bronze/Silver/Gold/Diamond cohorts, and writes this week's
 * `league_members` rows. Promotion / relegation flags are computed by
 * comparing each user's cohort to last week's.
 *
 * Idempotent — re-running for the same week overwrites previous rows.
 */
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await computeWeeklyLeagues();
    return NextResponse.json(
      { ok: true, placed: result.placed },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Cron weekly-leagues failed", error);
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}