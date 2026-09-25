import "server-only";

/**
 * Edge cache helpers using the Cloudflare Cache API (`caches.default`).
 *
 * Used by read-mostly public pages (marketing landing, course catalog,
 * course detail) to keep TTFB low on the Workers Free plan (FREE-TIER-
 * REFERENCE.md §1).
 *
 * Tag-based invalidation:
 *   The Cache API matches responses by the request URL only — it does
 *   not natively support purging by `Cache-Tag` header. We pair the
 *   Cache API with a small KV map (`cache_tag:<tag>` → array of cached
 *   request URLs). To purge by tag, we read the array, call
 *   `caches.default.delete(...)` per URL, then drop the tag entry. This
 *   stays on the Free plan: KV writes happen only on cache populates,
 *   and reads happen only on cache misses / purges.
 *
 * Boundary (per docs/remaster-phase-0-foundation.md §8):
 *   SKIP this wrapper for any request that reads the Clerk session cookie
 *   or otherwise returns per-user data. Layouts / pages that call
 *   `requireUser()` must set `dynamic = "force-dynamic"` themselves; we
 *   do not infer it here.
 */

import { enqueue } from "./queues";

export type EdgeCacheOptions = {
  /** Time in seconds the response is served from cache before revalidation. */
  ttl: number;
  /** Stale-while-revalidate window in seconds. Optional. */
  swr?: number;
  /** Cache tags for invalidation. Stored in the tag index. */
  tags?: string[];
  /**
   * Custom Cache instance name. Defaults to `default`. Workers supports
   * named caches via `caches.open(name)`; they share the per-isolate
   * limit (no extra cost).
   */
  cacheName?: string;
};

/**
 * Standard cache tag constants and helper functions.
 */
export const cacheTags = {
  marketingLanding: "marketing:landing",
  catalogList: "catalog:list",
  course: (slug: string) => `course:${slug}`,
  teacher: (handleOrId: string) => `teacher:${handleOrId}`,
  asset: (key: string) => `asset:${key}`,
} as const;

/**
 * Runtime detection: returns true only if the Cloudflare Cache API (caches.default)
 * is present and available in the current environment.
 */
export function hasCacheRuntime(): boolean {
  return (
    typeof (globalThis as unknown as { caches?: CacheStorage & { default?: Cache } })
      .caches?.default !== "undefined"
  );
}

/**
 * Checks whether the request carries a Clerk session cookie.
 * Authenticated requests must bypass the edge cache to prevent session bleed.
 */
export function hasSessionCookie(request: Request): boolean {
  const cookie = request.headers.get("cookie") || "";
  return cookie.includes("__session=");
}

/**
 * Generates canonical cache key for a request:
 * - Strips tracking and analytics query parameters (ts, utm_*)
 * - Distinguishes React Server Component (RSC) requests from full-document HTML requests
 *   via the `#__rsc__` fragment identifier so RSC payloads don't collide with HTML.
 */
export function cacheKey(request: Request): string {
  const url = new URL(request.url);
  const isRsc =
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1" ||
    request.headers.get("rsc") === "1";

  // Strip query params that should never affect identity (e.g. analytics).
  url.searchParams.delete("ts");
  url.searchParams.delete("utm_source");
  url.searchParams.delete("utm_medium");
  url.searchParams.delete("utm_campaign");

  if (isRsc) {
    url.searchParams.delete("_rsc");
    return `${url.toString()}#__rsc__`;
  }

  url.searchParams.delete("_rsc");
  return url.toString();
}

function buildCachedResponse(
  source: Response,
  ttl: number,
  swr: number | undefined
): Response {
  const headers = new Headers(source.headers);
  headers.set("Cache-Control", buildCacheControl(ttl, swr));
  headers.set("CDN-Cache-Control", buildCacheControl(ttl, swr));
  // `cf-cache-status` is set automatically by Cloudflare on responses
  // fetched via the Cache API; we do not set it here.
  return new Response(source.body, {
    status: source.status,
    statusText: source.statusText,
    headers,
  });
}

export function buildCacheControl(ttl: number, swr?: number): string {
  if (ttl <= 0) {
    return "no-store, no-cache";
  }
  if (swr && swr > 0) {
    return `public, max-age=${ttl}, stale-while-revalidate=${swr}`;
  }
  return `public, max-age=${ttl}`;
}

export async function openCache(cacheName?: string): Promise<Cache | null> {
  // `caches` and `caches.default` are Cloudflare Workers extensions to
  // the standard `CacheStorage` DOM type. We narrow via a runtime
  // check and gracefully return null if unavailable in Node/dev/test.
  const cs = (globalThis as unknown as { caches?: CacheStorage & { default?: Cache } })
    .caches;
  if (!cs) {
    return null;
  }
  if (cacheName) {
    try {
      return await cs.open(cacheName);
    } catch {
      return null;
    }
  }
  if (!cs.default) {
    return null;
  }
  return cs.default;
}

/**
 * Fetch through the edge cache. If a fresh entry exists, returns it;
 * otherwise calls `fetcher`, caches the response, and indexes it by
 * its declared tags for later purging.
 */
export async function edgeCache(
  request: Request,
  fetcher: () => Promise<Response>,
  opts: EdgeCacheOptions
): Promise<Response> {
  // Safe runtime detection & bypasses:
  // 1. Only GET and HEAD requests can be cached.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return fetcher();
  }
  // 2. Bypass when authenticated session cookie is present.
  if (hasSessionCookie(request)) {
    return fetcher();
  }
  // 3. Bypass if ttl is non-positive.
  if (opts.ttl <= 0) {
    return fetcher();
  }
  // 4. Safe runtime detection: if Cache API is unavailable in Node/dev/test.
  if (!hasCacheRuntime()) {
    return fetcher();
  }

  const cache = await openCache(opts.cacheName);
  if (!cache) {
    return fetcher();
  }

  const key = cacheKey(request);

  try {
    const cached = await cache.match(key);
    if (cached) return cached;
  } catch {
    // Non-fatal match failure
  }

  const fresh = await fetcher();
  // Never cache error / redirect / streaming responses.
  if (fresh.status >= 200 && fresh.status < 300) {
    const cachedResponse = buildCachedResponse(fresh, opts.ttl, opts.swr);
    // put() must be awaited before returning so the cache state is
    // consistent within this request, but we don't block the response
    // on KV tag indexing.
    try {
      await cache.put(key, cachedResponse.clone());
    } catch {
      // Non-fatal put failure
    }
    if (opts.tags && opts.tags.length) {
      void indexTags(key, opts.tags);
    }
  }
  return fresh;
}

/**
 * Invalidate every cached response tagged with `tag`. Called from server
 * actions when content changes (e.g. teacher publishes / updates /
 * unpublishes a course).
 *
 * Tag index lives in RATE_LIMIT_KV (the same binding is used by rate-
 * limiting and the cache index — both are tiny read/write workloads
 * that fit comfortably within the 1k writes/day Free quota).
 */
export async function purgeByTag(tag: string): Promise<void> {
  try {
    const { getRateLimitKv } = await import("./kv");
    const kv = await getRateLimitKv();
    if (!kv) return; // Node dev / missing binding — silent no-op

    const raw = await kv.get(`cache_tag:${tag}`);
    if (!raw) return;

    let urls: string[];
    try {
      urls = JSON.parse(raw) as string[];
    } catch {
      return;
    }

    const cache = await openCache();
    if (cache) {
      await Promise.all(urls.map((url) => cache.delete(url).catch(() => false)));
    }
    await kv.delete(`cache_tag:${tag}`);
  } catch {
    // Graceful fallback for non-Cloudflare/dev/test runtimes
  }
}

/**
 * Push a tag into the R0 cache index. Lazy-loaded so this module has no
 * hard dependency on `kv.ts` at import time.
 */
async function indexTags(url: string, tags: string[]): Promise<void> {
  try {
    const { getRateLimitKv } = await import("./kv");
    const kv = await getRateLimitKv();
    if (!kv) return;
    for (const tag of tags) {
      const key = `cache_tag:${tag}`;
      const raw = await kv.get(key);
      let urls: string[];
      try {
        urls = raw ? (JSON.parse(raw) as string[]) : [];
      } catch {
        urls = [];
      }
      if (!urls.includes(url)) {
        urls.push(url);
        // 7-day TTL on the tag index — older entries are stale and can
        // simply be ignored when a purge fires.
        await kv.put(key, JSON.stringify(urls), { expirationTtl: 7 * 24 * 60 * 60 });
      }
    }
  } catch {
    // Non-fatal indexing failure
  }
}

/**
 * Convenience: enqueue a background cache-purge via NOTIFICATIONS_QUEUE.
 * Used by server actions (course publish, etc.) so the request handler
 * returns immediately and the purge happens async. We reuse the
 * notifications queue to stay within the 1M msg/month Free quota
 * without provisioning a separate binding.
 */
export async function enqueuePurgeByTag(tag: string): Promise<void> {
  try {
    await enqueue("NOTIFICATIONS_QUEUE", {
      type: "cache.purge",
      id: `purge:${tag}:${Date.now()}`,
      payload: { tag },
    });
  } catch {
    // Graceful fallback if queue binding is unavailable in local dev / test
  }
}
