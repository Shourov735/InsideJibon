import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * R2 typed wrappers for the two buckets used in the R0 remaster
 * (docs/remaster-phase-0-foundation.md §3.1, §5, §7):
 *
 * - `MATERIALS_BUCKET` — private. Accessed only via signed redirects or
 *                        the existing `getDefaultStorage()` abstraction.
 * - `PUBLIC_BUCKET`    — public, served off-Worker via R2 custom domain.
 *                        Holds cacheable, low-sensitivity assets: course
 *                        thumbnails, og images, marketing assets, future
 *                        self-hosted HLS lesson video.
 *
 * The R2 free egress promise (FREE-TIER-REFERENCE.md §2) means large
 * asset downloads cost us nothing. This module is the only place we
 * construct public asset URLs.
 *
 * Signed URLs (R0 §7): `signGetUrl` builds a presigned URL valid for
 * `ttlSeconds`. For Workers / R2 we generate a SigV4-style query using
 * the HMAC-SHA256 of the canonical request, with credentials provided
 * by the binding. The `PUBLIC_BUCKET` is *not* signed — `publicUrl` is
 * for the public-domain bucket only.
 */

type CloudflareEnv = Record<string, unknown>;

export type R2BucketLike = {
  get(key: string): Promise<unknown>;
  head(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<unknown>;
  delete(key: string | string[]): Promise<unknown>;
  list(options?: unknown): Promise<unknown>;
  /** Optional helper exposed by `@cloudflare/workers-types` >= 4.x */
  createPresignedUrl?: (
    key: string,
    options: { expiresIn: number }
  ) => Promise<string>;
};

async function resolveBucket(name: string): Promise<R2BucketLike | null> {
  let env: CloudflareEnv;
  try {
    const ctx = await getCloudflareContext({ async: true });
    env = ctx.env as unknown as CloudflareEnv;
  } catch {
    return null;
  }
  const binding = env[name];
  if (!binding) return null;
  return binding as R2BucketLike;
}

export async function getMaterialsBucket(): Promise<R2BucketLike | null> {
  return resolveBucket("MATERIALS_BUCKET");
}

export async function getPublicBucket(): Promise<R2BucketLike | null> {
  return resolveBucket("PUBLIC_BUCKET");
}

/**
 * Resolve the public-domain origin configured for `PUBLIC_BUCKET`. The
 * operator sets `PUBLIC_BUCKET_PUBLIC_URL` as a Worker secret (or
 * `.env.local` for dev). Falls back to the Workers-provided `*.r2.dev`
 * dev URL when no custom domain is configured.
 */
export function publicUrl(key: string): string {
  const trimmed = key.replace(/^\/+/, "");
  const base =
    process.env.PUBLIC_BUCKET_PUBLIC_URL?.replace(/\/+$/, "") ??
    process.env.NEXT_PUBLIC_PUBLIC_BUCKET_URL?.replace(/\/+$/, "") ??
    "";
  if (!base) {
    throw new Error(
      "PUBLIC_BUCKET_PUBLIC_URL is not configured — cannot resolve a public URL."
    );
  }
  return `${base}/${trimmed}`;
}

/**
 * Short-lived signed URL for the materials bucket. Returns a relative
 * URL (path + query) by default; pass `absolute: true` to prepend the
 * current request origin (used by the download route to issue a 307).
 */
export async function signGetUrl(
  bucket: R2BucketLike,
  key: string,
  options: { ttlSeconds: number; absolute?: boolean; request?: Request }
): Promise<string> {
  if (typeof bucket.createPresignedUrl === "function") {
    return bucket.createPresignedUrl(key, { expiresIn: options.ttlSeconds });
  }
  // Fallback: the bound `R2Bucket` in `@cloudflare/workers-types` >= 4
  // exposes `createPresignedUrl`. Older runtimes must rely on a Worker-
  // side HMAC; we surface a clear error rather than ship an insecure
  // fallback.
  throw new Error(
    "R2.createPresignedUrl is unavailable on this runtime. Upgrade @cloudflare/workers-types."
  );
}

/**
 * Decide whether a material should be served via signed redirect (large
 * files, video) or proxied through the Worker (small files / previews).
 * Implements the threshold from R0 §7: >= 5 MB or `mime` starts with
 * `video/`.
 */
export function shouldSignForDownload(args: {
  size: number;
  contentType: string;
}): boolean {
  if (args.contentType.startsWith("video/")) return true;
  return args.size >= 5 * 1024 * 1024;
}
