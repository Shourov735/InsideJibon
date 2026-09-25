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

export function cacheKey(request: Request): string {
  const url = new URL(request.url);
  // Strip query params that should never affect identity (e.g. analytics).
  url.searchParams.delete("_rsc");
  url.searchParams.delete("ts");
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

function buildCacheControl(ttl: number, swr?: number): string {
  if (swr && swr > 0) {
    return `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${swr}`;
  }
  return `public, max-age=${ttl}, s-maxage=${ttl}`;
}

async function openCache(cacheName?: string): Promise<Cache> {
  // `caches` and `caches.default` are Cloudflare Workers extensions to
  // the standard `CacheStorage` DOM type. We narrow via a runtime
  // check and an unknown cast to avoid pulling `@cloudflare/workers-
  // types` into every consumer.
  const cs = (globalThis as unknown as { caches?: CacheStorage & { default?: Cache } })
    .caches;
  if (!cs) {
    throw new Error("Cache API is not available in this runtime.");
  }
  if (cacheName) {
    return cs.open(cacheName);
  }
  if (!cs.default) {
    throw new Error("Default Cache instance is not available in this runtime.");
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
  const cache = await openCache(opts.cacheName);
  const key = cacheKey(request);

  const cached = await cache.match(key);
  if (cached) return cached;

  const fresh = await fetcher();
  // Never cache error / redirect / streaming responses.
  if (fresh.status >= 200 && fresh.status < 300) {
    const cachedResponse = buildCachedResponse(fresh, opts.ttl, opts.swr);
    // put() must be awaited before returning so the cache state is
    // consistent within this request, but we don't block the response
    // on KV tag indexing.
    await cache.put(key, cachedResponse.clone());
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
  await Promise.all(urls.map((url) => cache.delete(url)));
  await kv.delete(`cache_tag:${tag}`);
}

/**
 * Push a tag into the R0 cache index. Lazy-loaded so this module has no
 * hard dependency on `kv.ts` at import time.
 */
async function indexTags(url: string, tags: string[]): Promise<void> {
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
}

/**
 * Convenience: enqueue a background cache-purge via NOTIFICATIONS_QUEUE.
 * Used by server actions (course publish, etc.) so the request handler
 * returns immediately and the purge happens async. We reuse the
 * notifications queue to stay within the 1M msg/month Free quota
 * without provisioning a separate binding.
 */
export async function enqueuePurgeByTag(tag: string): Promise<void> {
  await enqueue("NOTIFICATIONS_QUEUE", {
    type: "cache.purge",
    id: `purge:${tag}:${Date.now()}`,
    payload: { tag },
  });
}
