import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/permissions";
import { issueChunkUploadUrl } from "@/services/proctoring/webcam";

/**
 * R9 — Issue a presigned R2 PUT URL for a webcam chunk.
 *
 * The MediaRecorder slices the recording into 30-second chunks and
 * uploads each directly to R2 via the URL returned here. We never
 * proxy the binary through the Worker — that would saturate the
 * Workers Free plan's 10ms CPU + body-size budget immediately.
 *
 * The chunk number is client-generated; clients may start at 0 and
 * increment per chunk. The service layer clamps to a hard ceiling so
 * a misbehaving client cannot fill R2.
 */

const payloadSchema = z.object({
  chunkNumber: z.number().int().min(0).max(60 * 60 * 6),
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

  const result = await issueChunkUploadUrl({
    attemptId: id,
    chunkNumber: parsed.data.chunkNumber,
  });
  if (!result) {
    return NextResponse.json(
      { ok: false, detail: "not allowed or proctor storage unavailable" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(
    { ok: true, uploadUrl: result.uploadUrl, storageKey: result.storageKey, expiresAt: result.expiresAt },
    { headers: { "Cache-Control": "no-store" } }
  );
}
