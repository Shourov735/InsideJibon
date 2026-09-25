/**
 * Centralized rate-limit policy. The free Workers KV plan allows 1,000
 * writes/day and 100k reads/day, so every rate-limit decision costs at
 * least one read + (sometimes) one write. We size buckets accordingly:
 * most actions are limited to ~60 calls/min, with a few tighter limits
 * (signin, exam submit) and a few looser (cache miss purges).
 *
 * Apply via `await rateLimit(key, RATE_LIMIT_CONFIG.<bucket>)`.
 *
 * NOTE: each bucket has a `keyHint` that gets mixed into the KV key
 * alongside the caller-supplied key. Keep these stable — changing one
 * resets everyone's counters but does not otherwise affect behavior.
 */
export const RATE_LIMIT_CONFIG = {
  /** Clerk webhook ingestion — 60 events/min per Clerk dashboard ID. */
  "webhooks.clerk": { limit: 60, windowSec: 60, keyHint: "wh:clerk" },
  /** Server action: start an exam attempt. */
  "exam.start": { limit: 30, windowSec: 60, keyHint: "act:exam:start" },
  /** Server action: submit an exam attempt. */
  "exam.submit": { limit: 10, windowSec: 60, keyHint: "act:exam:submit" },
  /** Server action: submit an assignment. */
  "assignment.submit": { limit: 20, windowSec: 60, keyHint: "act:asg:submit" },
  /** Server action: upload a material. */
  "materials.upload": { limit: 10, windowSec: 60, keyHint: "act:mat:up" },
  /** Server action: create a payment intent (R6). */
  "payments.create": { limit: 5, windowSec: 60, keyHint: "act:pay:create" },
  /** AI tutor question (R8). */
  "ai.tutor.ask": { limit: 20, windowSec: 60, keyHint: "act:ai:tutor" },
  /** Public sign-in attempt — coarse IP-based bucket. */
  "auth.signin": { limit: 10, windowSec: 60, keyHint: "auth:signin" },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMIT_CONFIG;

export type RateLimitDecision = {
  ok: boolean;
  /** How many requests are still allowed in the current window. */
  remaining: number;
  /** Seconds until the bucket fully empties. */
  resetSec: number;
};
