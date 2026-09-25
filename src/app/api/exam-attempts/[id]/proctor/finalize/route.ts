import { NextResponse } from "next/server";

import { requireUser } from "@/lib/permissions";

/**
 * R9 — Mark an exam attempt's webcam recording as finalized.
 *
 * The browser fires this once the MediaRecorder stops (or, more
 * reliably, on `submit`). The actual concatenation lives in a queue
 * consumer (out-of-band) — this endpoint records the marker on the
 * attempt and tells the consumer which attempt to assemble.
 */
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  _context: { params: Promise<{ id: string }> }
) {
  await requireUser();
  // Concatenation is queued by R9 §3.6 via the notifications queue.
  // Today's stub: 204 No Content, marker recorded by the queue
  // consumer later.
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
