import { NextResponse } from "next/server";

import { grantWeeklyFreezes } from "@/services/gamification";

/**
 * R5 Cron Trigger — weekly streak-freeze grant.
 *
 * Fires Monday 00:00 UTC via `wrangler.jsonc`'s `triggers.crons`. The
 * service resets `freezes_available = 2` for every user whose
 * `freezes_used_at` is older than the start of this week (i.e. they
 * haven't already been refilled this week — making the trigger
 * idempotent under re-runs).
 *
 * Cloudflare Workers Free plan allows 5 cron triggers per worker. With
 * leaderboard + 3 R5 crons we sit at 4 — within budget.
 */
export const runtime = "nodejs";

export async function GET() {
  try {
    const updated = await grantWeeklyFreezes();
    return NextResponse.json(
      { ok: true, refilled: updated },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Cron streak-freezes failed", error);
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}