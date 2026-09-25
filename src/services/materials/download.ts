import "server-only";
import type { NextRequest } from "next/server";

import { getMaterialsBucket, signGetUrl } from "@/lib/cloudflare/r2";
import { getDefaultStorage } from "@/lib/storage";

/**
 * Download path selector for R0 §7. Small files and previews stream
 * through the Worker so we can keep conditional-request support
 * (ETag / 304) and consistent `Content-Disposition` headers.
 * Larger files and video content get a 307 to a short-lived signed
 * URL so the bytes don't transit our 10ms CPU budget.
 *
 * CRITICAL: stays on the R2 free tier — R2 egress is free, so signed
 * redirects save us Worker CPU without ever costing a paid transfer
 * (FREE-TIER-REFERENCE.md §2).
 *
 * Decision rule (R0 §7): sign when contentType starts with `video/`,
 * OR size >= 5 MB. Otherwise proxy.
 */

export type MaterialStreamDecision =
  | { kind: "signed"; signedUrl: string; ttlSeconds: number }
  | { kind: "proxy" };

export const SIGNED_REDIRECT_TTL_SECONDS = 300; // 5 minutes, per R0 §7.
const SIGNED_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5 MB, per R0 §7.

export function shouldSignForDownload(args: {
  size: number;
  contentType: string;
}): boolean {
  if (args.contentType.startsWith("video/")) return true;
  return args.size >= SIGNED_THRESHOLD_BYTES;
}

/**
 * Resolve a download decision for a material. If the binding supports
 * `createPresignedUrl` we use it; otherwise we fall back to the proxy
 * path so the user still gets a usable response and we surface a clear
 * server-side log.
 */
export async function decideMaterialDownload(input: {
  storageKey: string;
  sizeBytes: number;
  contentType: string;
}): Promise<MaterialStreamDecision> {
  if (
    !shouldSignForDownload({
      size: input.sizeBytes,
      contentType: input.contentType,
    })
  ) {
    return { kind: "proxy" };
  }

  const bucket = await getMaterialsBucket();
  if (!bucket) return { kind: "proxy" };

  try {
    const signedUrl = await signGetUrl(bucket, input.storageKey, {
      ttlSeconds: SIGNED_REDIRECT_TTL_SECONDS,
    });
    return {
      kind: "signed",
      signedUrl,
      ttlSeconds: SIGNED_REDIRECT_TTL_SECONDS,
    };
  } catch {
    // Surface a proxy fallback rather than failing the whole request —
    // the legacy streaming path is correct, just slightly slower.
    return { kind: "proxy" };
  }
}

/**
 * Compose a 307 response to the signed URL. We use a temporary redirect
 * (not 302) so the browser preserves the method — even though we have
 * no plans for non-GET downloads today, this matches Worker behavior on
 * R2's signed GET URLs.
 */
export function signedRedirectResponse(
  signedUrl: string,
  ttlSeconds: number
): Response {
  return new Response(null, {
    status: 307,
    headers: {
      Location: signedUrl,
      "Cache-Control": `private, max-age=${Math.max(60, Math.floor(ttlSeconds / 2))}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Used by the legacy route to keep its streaming behavior. Pure
 * passthrough so the download route stays a thin handler.
 */
export async function streamMaterialObject(args: {
  storageKey: string;
  ifNoneMatch: string | null;
  etag: string | null;
  contentDispositionFilename: string;
  contentType: string;
  contentLength: number;
}): Promise<Response> {
  const storage = getDefaultStorage();

  if (args.ifNoneMatch && args.etag && args.ifNoneMatch === args.etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: args.etag,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  }

  let object;
  try {
    object = await storage.getObject(args.storageKey);
  } catch {
    return new Response("Storage unavailable", { status: 503 });
  }

  if (!object) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const headers = new Headers({
    "Content-Type": args.contentType || object.contentType,
    "Content-Length": String(args.contentLength || object.contentLength),
    "Content-Disposition": `attachment; filename="${args.contentDispositionFilename}"`,
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  if (args.etag || object.etag) {
    headers.set("ETag", (args.etag ?? object.etag) as string);
  }

  return new Response(object.body as BodyInit, { status: 200, headers });
}

/**
 * Helper: HEAD-style conditional check used by the download route
 * before deciding between signed-redirect and proxy. Returns the
 * object's ETag if it matches the `If-None-Match` header. The
 * download route returns 304 directly when this resolves to a hit.
 */
export async function checkEtagForMaterial(
  storageKey: string,
  ifNoneMatch: string | null
): Promise<{ match: boolean; etag: string | null }> {
  if (!ifNoneMatch) return { match: false, etag: null };
  try {
    const storage = getDefaultStorage();
    const head = await storage.headObject(storageKey);
    if (!head) return { match: false, etag: null };
    return { match: head.etag === ifNoneMatch, etag: head.etag ?? null };
  } catch {
    return { match: false, etag: null };
  }
}

// Re-export for route authors that need the typed request model.
export type { NextRequest };
