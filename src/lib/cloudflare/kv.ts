import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Typed accessors for the three Workers KV namespaces introduced in the
 * R0 remaster (see docs/remaster-phase-0-foundation.md §3.1 and §5):
 *
 * - `RATE_LIMIT_KV` — sliding-window rate-limit buckets.
 * - `SESSION_KV`     — secondary, KV-backed session/cookie metadata cache
 *                      (mirror; source of truth remains the Clerk-issued
 *                      `__session` cookie).
 * - `FEATURE_FLAGS_KV` — hot read mirror of the `feature_flags` table.
 *
 * Bindings are resolved lazily on every call, per the Cloudflare / OpenNext
 * runtime model. In Node dev (no bindings), each accessor returns `null`
 * so callers can fall back to an in-memory / file-backed path without
 * crashing on import.
 *
 * CRITICAL: no paid KV tier. We stay on the Free plan: 100k reads/day,
 * 1k writes/day, 1k deletes/day, 1 GB. See FREE-TIER-REFERENCE.md §1.
 */

export type KvNamespaceLike = {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number; metadata?: Record<string, unknown> }
  ): Promise<void>;
  delete(key: string): Promise<void>;
};

type CloudflareBindings = Record<string, unknown>;

async function resolveBinding(name: string): Promise<KvNamespaceLike | null> {
  let env: CloudflareBindings;
  try {
    const ctx = await getCloudflareContext({ async: true });
    env = ctx.env as unknown as CloudflareBindings;
  } catch {
    return null;
  }
  const binding = env[name];
  if (!binding || typeof (binding as KvNamespaceLike).get !== "function") {
    return null;
  }
  return binding as KvNamespaceLike;
}

export async function getRateLimitKv(): Promise<KvNamespaceLike | null> {
  return resolveBinding("RATE_LIMIT_KV");
}

export async function getSessionKv(): Promise<KvNamespaceLike | null> {
  return resolveBinding("SESSION_KV");
}

export async function getFeatureFlagsKv(): Promise<KvNamespaceLike | null> {
  return resolveBinding("FEATURE_FLAGS_KV");
}

/**
 * Type guard: returns true only when the current runtime exposes real
 * Workers KV. Used by the rate-limit and feature-flag services to
 * decide between KV-backed and in-memory fallback paths.
 */
export async function hasKvRuntime(): Promise<boolean> {
  return (await resolveBinding("RATE_LIMIT_KV")) !== null;
}
