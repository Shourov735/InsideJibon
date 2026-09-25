import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/permissions";
import { recordEvent } from "@/services/proctoring/events";
import { EXAM_PROCTOR_KINDS } from "@/db/schema";

/**
 * R9 — Single-shot proctor event ingestion.
 *
 * The exam-taker toolbar posts one event per signal:
 *   - fullscreen.enter / fullscreen.exit
 *   - tab.blur / tab.focus
 *   - webcam.start / webcam.stop / webcam.chunk
 *   - paste / rightclick
 *
 * The handler delegates to `recordEvent`, which atomically bumps the
 * per-attempt flag counter on Neon HTTP (no transactions available).
 * The response carries the latest counter so the client toolbar can
 * reflect the threshold in real time.
 *
 * Idempotency: events are append-only and bounded by `id BIGSERIAL`. A
 * client retry creates a second row — that's by design; duplicates are
 * cheap and a missed event is worse than a duplicate for review.
 */

const payloadSchema = z.object({
  kind: z.enum(EXAM_PROCTOR_KINDS),
  payload: z.record(z.string(), z.unknown()),
});

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await requireUser();

  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, detail: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const result = await recordEvent({
      attemptId: id,
      kind: parsed.data.kind,
      payload: parsed.data.payload,
    });
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, detail: (error as Error).message },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
