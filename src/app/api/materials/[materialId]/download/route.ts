import type { NextRequest } from "next/server";

import { resolveCurrentUser } from "@/lib/auth";
import {
  checkEtagForMaterial,
  decideMaterialDownload,
  signedRedirectResponse,
  streamMaterialObject,
} from "@/services/materials/download";
import { resolveMaterialForUser } from "@/services/materials";
import { toContentDispositionFilename } from "@/schemas/material";

export const dynamic = "force-dynamic";

/**
 * Authorized material download (R0 §7).
 *
 * Flow:
 *  1. authenticate (`resolveCurrentUser`)
 *  2. authorize (`resolveMaterialForUser`)
 *  3. HEAD-style conditional check via ETag — 304 short-circuits the rest.
 *  4. decision:
 *     - video/* OR >= 5 MB → 307 to a short-lived signed R2 URL
 *     - otherwise          → stream through the Worker (immutable cache)
 *
 * The R2 object key never leaves the server and the bucket stays
 * private. "Unauthorized" and "missing" render the same sanitized 404
 * so material existence cannot be probed across tenants.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ materialId: string }> }
) {
  const { materialId } = await context.params;
  const { user } = await resolveCurrentUser();

  const notFound = () =>
    new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  if (!user) return notFound();
  if (user.role !== "teacher" && user.role !== "student") return notFound();

  const material = await resolveMaterialForUser(user.id, user.role, materialId);
  if (!material) return notFound();

  // Conditional request — short-circuit before the size classification.
  const ifNoneMatch = request.headers.get("if-none-match");
  const etagCheck = await checkEtagForMaterial(material.storageKey, ifNoneMatch);
  if (etagCheck.match && etagCheck.etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etagCheck.etag,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  }

  // Classify: signed-redirect vs proxy.
  const decision = await decideMaterialDownload({
    storageKey: material.storageKey,
    sizeBytes: material.sizeBytes,
    contentType: material.mimeType,
  });

  if (decision.kind === "signed") {
    return signedRedirectResponse(decision.signedUrl, decision.ttlSeconds);
  }

  return streamMaterialObject({
    storageKey: material.storageKey,
    ifNoneMatch,
    etag: etagCheck.etag,
    contentDispositionFilename: toContentDispositionFilename(material.originalFilename),
    contentType: material.mimeType,
    contentLength: material.sizeBytes,
  });
}
