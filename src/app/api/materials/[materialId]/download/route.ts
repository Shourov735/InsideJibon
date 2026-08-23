import type { NextRequest } from "next/server";

import { resolveCurrentUser } from "@/lib/auth";
import { etagMatches } from "@/lib/http";
import { getDefaultStorage } from "@/lib/storage";
import { toContentDispositionFilename } from "@/schemas/material";
import { resolveMaterialForUser } from "@/services/materials";

export const dynamic = "force-dynamic";

/**
 * Authorized material download.
 *
 * Flow: authenticate → resolve the material for the requester through the
 * role-appropriate chain (teacher → course ownership, student → enrollment
 * in a published course) → stream the object from R2 → return it with
 * attachment headers.
 *
 * Storage keys are immutable (server-generated UUIDs), so responses are
 * privately cacheable and conditional requests are answered with a 304 via a
 * cheap HEAD — repeat downloads skip the R2 body read entirely.
 *
 * The R2 object key never leaves the server and the bucket stays private.
 * "Unauthorized" and "missing" render the same sanitized 404 so material
 * existence cannot be probed across tenants.
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

  const storage = getDefaultStorage();
  const immutableCache = "private, max-age=31536000, immutable";

  // Conditional request: revalidate with a HEAD instead of pulling the body.
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch) {
    try {
      const head = await storage.headObject(material.storageKey);
      if (head && etagMatches(ifNoneMatch, head.etag)) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: head.etag!,
            "Cache-Control": immutableCache,
          },
        });
      }
    } catch {
      // Fall through to the full GET path on storage errors.
    }
  }

  let object;
  try {
    object = await storage.getObject(material.storageKey);
  } catch {
    // Storage failure — sanitized; never expose internal storage errors.
    return new Response("Storage unavailable", { status: 503 });
  }

  if (!object) {
    // Metadata row exists but the object is gone (e.g. a cleanup race).
    // Same sanitized response as unauthorized — no internal state leaks.
    return notFound();
  }

  if (object.contentLength !== material.sizeBytes) {
    // Stored bytes disagree with metadata — do not stream mismatched data.
    return notFound();
  }

  const dispositionFilename = toContentDispositionFilename(material.originalFilename);
  const headers = new Headers({
    "Content-Type": object.contentType,
    "Content-Length": String(object.contentLength),
    "Content-Disposition": `attachment; filename="${dispositionFilename}"`,
    "Cache-Control": immutableCache,
    "X-Content-Type-Options": "nosniff",
  });
  if (object.etag) headers.set("ETag", object.etag);

  return new Response(object.body as BodyInit, { status: 200, headers });
}
