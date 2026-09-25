import { NextResponse } from "next/server";

import { requireUser } from "@/lib/permissions";
import {
  uploadPaymentScreenshot,
  ScreenshotTooLargeError,
  ScreenshotTypeNotAllowedError,
  ScreenshotUploadUnavailableError,
} from "@/services/payments";

export const runtime = "nodejs";

/**
 * R6 — payment screenshot upload.
 *
 * Accepts a single image (PNG / JPG / WebP, ≤ 2 MB). Returns the
 * `screenshot_key` the form then submits to the payment action.
 *
 * The `submission_id` segment is encoded into the object key so the admin
 * reviewer can find it without a DB lookup. We accept any UUID-like
 * identifier from the client; the action's server-side check is the
 * authoritative gate.
 */
export async function POST(req: Request) {
  const user = await requireUser();

  const form = await req.formData();
  const file = form.get("file");
  const rawSubmissionId = form.get("submissionId");
  const submissionId =
    typeof rawSubmissionId === "string" && rawSubmissionId.length > 0
      ? rawSubmissionId
      : `pending-${Date.now()}`;

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file uploaded." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const { key } = await uploadPaymentScreenshot({
      userId: user.id,
      submissionId,
      file,
    });
    return NextResponse.json(
      { key },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (
      error instanceof ScreenshotTooLargeError ||
      error instanceof ScreenshotTypeNotAllowedError ||
      error instanceof ScreenshotUploadUnavailableError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("[/api/payments/screenshot] failed", error);
    return NextResponse.json(
      { error: "Upload failed." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}