import { NextResponse } from "next/server";

import { refillTick } from "@/services/gamification";

/**
 * R5 Cron Trigger — energy / lives refill tick.
 *
 * Fires every 5 minutes via `wrangler.jsonc`'s `triggers.crons`. Grants
 * +1 energy to every user whose `next_refill_at` has elapsed (capped at
 * `max_energy`), and pushes `next_refill_at` forward by 30 minutes.
 *
 * Idempotent under concurrent ticks: the conditional UPDATE keyed on
 * `next_refill_at < now` ensures each row is credited at most once per
 * tick.
 */
export const runtime = "nodejs";

export async function GET() {
  try {
    const updated = await refillTick();
    return NextResponse.json(
      { ok: true, credited: updated },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Cron energy-refill failed", error);
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}