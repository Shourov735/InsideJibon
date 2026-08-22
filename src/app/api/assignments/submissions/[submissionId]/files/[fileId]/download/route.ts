import type { NextRequest } from "next/server";

import { resolveCurrentUser } from "@/lib/auth";
import { getDefaultStorage } from "@/lib/storage";
import { toContentDispositionFilename } from "@/schemas/assignment";
import { resolveSubmissionFileForUser } from "@/services/assignments";

export const dynamic = "force-dynamic";

/**
 * Authorized submission-file download.
 *
 * Flow: authenticate → resolve the file for the requester through the
 * role-appropriate chain (teacher → assignment ownership, student → own
 * submission) → stream the object from R2 → return it with attachment headers.
 *
 * Unauthorized and missing render the same sanitized 404 so submission file
 * existence cannot be probed across tenants; internal storage errors never leak.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ submissionId: string; fileId: string }> }
) {
  const { submissionId, fileId } = await context.params;
  const { user } = await resolveCurrentUser();

  const notFound = () =>
    new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  if (!user) return notFound();
  if (user.role !== "teacher" && user.role !== "student") return notFound();

  const file = await resolveSubmissionFileForUser(user.id, user.role, submissionId, fileId);
  if (!file) return notFound();

  let object;
  try {
    object = await getDefaultStorage().getObject(file.storageKey);
  } catch {
    // Storage failure — sanitized; never expose internal storage errors.
    return new Response("Storage unavailable", { status: 503 });
  }

  if (!object) {
    // Metadata row exists but the object is gone (e.g. a cleanup race).
    return notFound();
  }

  if (object.contentLength !== file.sizeBytes) {
    // Stored bytes disagree with metadata — do not stream mismatched data.
    return notFound();
  }

  const dispositionFilename = toContentDispositionFilename(file.originalFilename);
  const headers = new Headers({
    "Content-Type": file.mimeType,
    "Content-Length": String(object.contentLength),
    "Content-Disposition": `attachment; filename="${dispositionFilename}"; filename*=UTF-8''${encodeURIComponent(dispositionFilename)}`,
    "Cache-Control": "no-store, private",
    "X-Content-Type-Options": "nosniff",
  });
  if (object.etag) headers.set("ETag", object.etag);

  return new Response(object.body as BodyInit, { status: 200, headers });
}