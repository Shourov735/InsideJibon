import "server-only";

import { getRateLimitKv, hasKvRuntime, type KvNamespaceLike } from "@/lib/cloudflare/kv";
import {
  type RateLimitBucket,
  RATE_LIMIT_CONFIG,
  type RateLimitDecision,
} from "@/lib/security/rate-limit-config";

/**
 * Sliding-window rate limiter backed by Workers KV.
 *
 * Storage model: a single KV value at key `rl:<hint>:<callerKey>` holds a
 * JSON array of epoch-millisecond timestamps of recent hits. On each
 * call we:
 *   1. Read the array.
 *   2. Drop any entries older than `windowSec` from `now`.
 *   3. If the array already has `limit` entries, reject (remaining = 0).
 *   4. Otherwise append `now` and write the array back with a TTL of
 *      `windowSec + 5` (small slack for clock skew).
 *
 * The array length is bounded by `limit`, so the JSON value size never
 * exceeds ~`limit * 14` bytes — comfortably under the 25 KB KV value
 * limit for our typical limit of 60.
 *
 * Free-plan budget: each decision is 1 read + (sometimes) 1 write, plus
 * a single read on the no-op KV-only paths. We stay well under the
 * 100k reads/day and 1k writes/day budgets (FREE-TIER-REFERENCE.md §1).
 *
 * Fallback: when KV is not configured (Node dev, missing binding), the
 * limiter degrades to an in-memory sliding window so tests and local
 * dev still get correct behavior. The in-memory map is process-local
 * and MUST NOT be relied on for production isolation.
 */

type Window = number[];

const memoryFallback: Map<string, Window> = (() => {
  // Only used in Node dev / test paths.
  if (typeof globalThis !== "undefined") {
    const g = globalThis as { __rl_memory__?: Map<string, Window> };
    if (!g.__rl_memory__) g.__rl_memory__ = new Map();
    return g.__rl_memory__;
  }
  return new Map<string, Window>();
})();

function kvKey(bucket: RateLimitBucket, callerKey: string): string {
  return `rl:${RATE_LIMIT_CONFIG[bucket].keyHint}:${callerKey}`;
}

function prune(window: Window, windowMs: number, now: number): void {
  const cutoff = now - windowMs;
  let i = 0;
  while (i < window.length && window[i] < cutoff) i++;
  if (i > 0) window.splice(0, i);
}

/**
 * Check (and consume) one rate-limit slot. Returns the decision; the
 * caller decides what to do with a rejected bucket (typically: respond
 * 429 with the remaining-seconds header).
 *
 * The `callerKey` should be a stable per-actor identifier — typically
 * `user.id` for authenticated actions and `ip:<addr>` for unauth
 * paths. Callers are responsible for sourcing it; the limiter does not
 * inspect the request.
 */
export async function rateLimit(
  bucket: RateLimitBucket,
  callerKey: string
): Promise<RateLimitDecision> {
  const config = RATE_LIMIT_CONFIG[bucket];
  const now = Date.now();
  const windowMs = config.windowSec * 1000;
  const key = kvKey(bucket, callerKey);

  const runtimeAvailable = await hasKvRuntime();
  if (!runtimeAvailable) {
    return memoryDecision(key, now, windowMs, config.limit);
  }

  const kv = (await getRateLimitKv()) as KvNamespaceLike | null;
  if (!kv) {
    return memoryDecision(key, now, windowMs, config.limit);
  }

  const raw = await kv.get(key);
  const window: Window = raw ? safeParse(raw) : [];

  prune(window, windowMs, now);

  if (window.length >= config.limit) {
    const oldest = window[0] ?? now;
    const resetSec = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    );
    // Persist the pruned window so the bucket doesn't "leak" entries.
    await kv.put(key, JSON.stringify(window), {
      expirationTtl: config.windowSec + 5,
    });
    return { ok: false, remaining: 0, resetSec };
  }

  window.push(now);
  await kv.put(key, JSON.stringify(window), {
    expirationTtl: config.windowSec + 5,
  });

  return {
    ok: true,
    remaining: Math.max(0, config.limit - window.length),
    resetSec: config.windowSec,
  };
}

function safeParse(raw: string): Window {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is number => typeof v === "number");
  } catch {
    return [];
  }
}

function memoryDecision(
  key: string,
  now: number,
  windowMs: number,
  limit: number
): RateLimitDecision {
  const window = memoryFallback.get(key) ?? [];
  prune(window, windowMs, now);

  if (window.length >= limit) {
    const oldest = window[0] ?? now;
    const resetSec = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    );
    memoryFallback.set(key, window);
    return { ok: false, remaining: 0, resetSec };
  }

  window.push(now);
  memoryFallback.set(key, window);
  return {
    ok: true,
    remaining: Math.max(0, limit - window.length),
    resetSec: Math.ceil(windowMs / 1000),
  };
}

/**
 * Helper for use in route handlers / server actions: if the bucket is
 * exhausted, returns a 429 `Response`; otherwise returns `null`.
 *
 * Typical usage:
 *   const blocked = await enforceRateLimit("exam.submit", user.id);
 *   if (blocked) return blocked;
 */
export async function enforceRateLimit(
  bucket: RateLimitBucket,
  callerKey: string
): Promise<Response | null> {
  const decision = await rateLimit(bucket, callerKey);
  if (decision.ok) return null;

  return new Response("Too many requests", {
    status: 429,
    headers: {
      "Retry-After": String(decision.resetSec),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(decision.resetSec),
      "Cache-Control": "no-store",
    },
  });
}
