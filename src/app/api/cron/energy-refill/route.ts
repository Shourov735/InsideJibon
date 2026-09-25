import { NextResponse } from "next/server";

import { refillTick } from "@/services/gamification";
import { emitClassReminders } from "@/services/classes";
import { expireStaleSubmissions } from "@/services/payments";

/**
 * R5 / R3 / R6 Cron Trigger — energy / lives refill tick + class reminder
 * fan-out + payment submission expiration. Fires every 5 minutes via
 * `wrangler.jsonc`'s `triggers.crons`.
 *
 * Three unrelated jobs share the slot because Cloudflare's Free plan is
 * capped at 5 Cron Triggers per Worker (R9 fills the fifth slot).
 *
 *   1. `refillTick()` — credits +1 energy to every user whose
 *      `next_refill_at` has elapsed (capped at `max_energy`).
 *
 *   2. `emitClassReminders()` — emits a one-shot `class.reminder`
 *      notification per `class_sessions` row whose lobby has opened
 *      and whose `scheduled_at` falls within the next 15 minutes. The
 *      `class_reminder_sent_at` column guarantees no duplicate
 *      notifications across consecutive ticks.
 *
 *   3. `expireStaleSubmissions()` — flips any `payment_submissions`
 *      whose `expires_at` has elapsed to `status='expired'`. Same
 *      idempotency pattern as #1 and #2.
 *
 * All three functions are idempotent under concurrent ticks.
 */
export const runtime = "nodejs";

export async function GET() {
  try {
    const [credited, reminders, expiredSubmissions] = await Promise.all([
      refillTick(),
      emitClassReminders(15),
      expireStaleSubmissions(),
    ]);
    return NextResponse.json(
      { ok: true, credited, reminders, expiredSubmissions },
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
