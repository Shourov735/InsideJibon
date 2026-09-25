import "server-only";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/permissions";
import { buildIcalForUser } from "@/services/classes";

export const runtime = "nodejs";

/**
 * R3 — iCal feed for the caller.
 *
 *   GET /api/live/ical        → text/calendar ICS body
 *
 * The caller is identified via `requireUser()` — same identity chain
 * used by the rest of the live-class surface. Students receive their
 * enrolled-class schedule; teachers receive the schedule for the
 * courses they own.
 *
 * Set `Cache-Control: private, no-store` — the body is personalized
 * and must never be served from a CDN cache.
 */
export async function GET(): Promise<Response> {
  const user = await requireUser();
  if (user.role !== "student" && user.role !== "teacher") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const body = await buildIcalForUser(user.id, user.role);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="insidejibon-${user.role}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
