/**
 * R6 — payment screenshot upload.
 *
 * Students can optionally attach a screenshot of their bKash Send-Money
 * receipt as proof. We store it in the existing MATERIALS_BUCKET under
 * `payments/{user_id}/{submission_id}.{ext}` and only the admin reviewer
 * ever reads the image back. We never embed it in HTML email.
 *
 * Constraints:
 *   - ≤ 2 MB
 *   - PNG, JPG, WebP only
 *   - Returns an opaque `screenshot_key`; the admin tool resolves it to a
 *     signed URL through `getObject` + a short-lived download route.
 */

import "server-only";

import { getDefaultStorage, StorageUnavailableError } from "@/lib/storage";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export class ScreenshotTooLargeError extends Error {
  constructor() {
    super("Screenshot must be 2 MB or smaller.");
  }
}

export class ScreenshotTypeNotAllowedError extends Error {
  constructor() {
    super("Screenshot must be a PNG, JPG, or WebP image.");
  }
}

export class ScreenshotUploadUnavailableError extends Error {
  constructor() {
    super("Screenshot upload is temporarily unavailable. Submit without one.");
  }
}

export async function uploadPaymentScreenshot(input: {
  userId: string;
  submissionId: string;
  file: { size: number; type: string; arrayBuffer(): Promise<ArrayBuffer> };
}): Promise<{ key: string }> {
  if (!ALLOWED_MIME.has(input.file.type)) {
    throw new ScreenshotTypeNotAllowedError();
  }
  if (input.file.size <= 0 || input.file.size > MAX_SIZE_BYTES) {
    throw new ScreenshotTooLargeError();
  }

  const ext = EXT_BY_MIME[input.file.type] ?? "png";
  const key = `payments/${input.userId}/${input.submissionId}.${ext}`;

  try {
    const body = await input.file.arrayBuffer();
    await getDefaultStorage().putObject({
      key,
      body,
      contentType: input.file.type,
      customMetadata: { userId: input.userId, submissionId: input.submissionId },
    });
  } catch (error) {
    if (error instanceof StorageUnavailableError) {
      throw new ScreenshotUploadUnavailableError();
    }
    if (error instanceof Error && error.name === "StorageError") {
      console.error("[payments/screenshot-upload] storage error", error);
      throw new ScreenshotUploadUnavailableError();
    }
    throw error;
  }
  return { key };
}
