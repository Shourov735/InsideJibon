import "server-only";

import { getRateLimitKv, type KvNamespaceLike } from "@/lib/cloudflare/kv";
import { getFeatureFlagsKv } from "@/lib/cloudflare/kv";

/**
 * R8 §5 — Free-tier Neurons daily guard.
 *
 * Workers AI free tier caps total inference at 10,000 Neurons / day
 * (see FREE-TIER-REFERENCE.md §6). R8 budget = 8,000 Neurons / day;
 * above that the tutor returns 503 with `reason: 'free_tier_exhausted'`
 * so the user sees the in-app fallback ("Ask the teacher instead").
 *
 * Reading real Workers AI Neuron counts requires the Analytics Engine
 * SQL API or the dashboard. The Workers runtime can NOT query Workers
 * AI's internal metering directly — that data lives outside the
 * Worker's environment. So we approximate with a per-app counter
 * stored in FEATURE_FLAGS_KV that the operator (or a cron) increments
 * after each inference batch. The counter is read here.
 *
 * Local dev: the KV binding is missing → we read no counter and treat
 * the budget as available. Production: the operator must run a small
 * cron / wrangler-tail-fed job that writes `neurons_used:<YYYY-MM-DD>`
 * to FEATURE_FLAGS_KV. Until that job ships, the guard is permissive.
 *
 * If a hard override is needed (e.g. marketing demo), the operator can
 * write `FEATURE_FLAGS_KV["ai:forced_off"]` = "1" to disable the tutor
 * globally.
 */

export const NEURONS_DAILY_BUDGET = 8000;
const COUNTER_KEY_PREFIX = "ai:neurons_used:";
const FORCED_OFF_KEY = "ai:forced_off";

export type BudgetState = {
  available: boolean;
  reason?: "free_tier_exhausted" | "feature_disabled";
  used: number;
  budget: number;
  resetSec: number;
};

/**
 * Returns the current budget state. Cheap — one KV read on the hot
 * path. We do NOT cache aggressively; a 1-second skew on "exhausted"
 * is acceptable for a guardrail.
 */
export async function getBudgetState(now: Date = new Date()): Promise<BudgetState> {
  const flags = await getFeatureFlagsKv();
  if (!flags) {
    // Node dev / missing binding — permissive.
    return { available: true, used: 0, budget: NEURONS_DAILY_BUDGET, resetSec: 0 };
  }
  const forced = await flags.get(FORCED_OFF_KEY);
  if (forced === "1") {
    return {
      available: false,
      reason: "feature_disabled",
      used: 0,
      budget: 0,
      resetSec: 0,
    };
  }
  const usedRaw = await flags.get(COUNTER_KEY_PREFIX + usageDay(now));
  const used = Number.parseInt(usedRaw ?? "0", 10) || 0;
  if (used >= NEURONS_DAILY_BUDGET) {
    return {
      available: false,
      reason: "free_tier_exhausted",
      used,
      budget: NEURONS_DAILY_BUDGET,
      resetSec: secondsUntilUtcMidnight(now),
    };
  }
  return {
    available: true,
    used,
    budget: NEURONS_DAILY_BUDGET,
    resetSec: secondsUntilUtcMidnight(now),
  };
}

/**
 * Optional helper: increment the counter after a successful AI call.
 * Called from the pipeline consumer (caption embedding) and the tutor
 * endpoint. The KV write counts against the 1k writes/day Free budget
 * — keep usage of this helper low. We only call it for batches >= 32
 * chunks; smaller batches are absorbed by the dashboard's own view.
 */
export async function recordNeuronUsage(
  estimatedNeurons: number,
  now: Date = new Date()
): Promise<void> {
  if (estimatedNeurons <= 0) return;
  const flags = await getFeatureFlagsKv();
  if (!flags) return;
  const key = COUNTER_KEY_PREFIX + usageDay(now);
  const raw = await flags.get(key);
  const used = Number.parseInt(raw ?? "0", 10) || 0;
  await flags.put(key, String(used + estimatedNeurons), {
    expirationTtl: 60 * 60 * 36, // 36h — past the UTC reset so cleanup is automatic
  });
}

/**
 * Operator escape hatch: forcibly toggle the tutor on/off. The dashboard
 * UI does not expose this; admins / cron jobs call it directly via the
 * `manageBudget` server action (R8 §4.3).
 */
export async function setTutorEnabled(enabled: boolean): Promise<boolean> {
  const flags = await getFeatureFlagsKv();
  if (!flags) return false;
  if (enabled) {
    await flags.delete(FORCED_OFF_KEY);
  } else {
    await flags.put(FORCED_OFF_KEY, "1", { expirationTtl: 60 * 60 * 24 });
  }
  return true;
}

/**
 * Read the daily counter for the dashboard UI ("today's Neurons used:
 * 6,200 / 8,000"). Returns 0 in dev.
 */
export async function readNeuronCounter(now: Date = new Date()): Promise<number> {
  const flags = (await getFeatureFlagsKv()) as KvNamespaceLike | null;
  if (!flags) return 0;
  const raw = await flags.get(COUNTER_KEY_PREFIX + usageDay(now));
  return Number.parseInt(raw ?? "0", 10) || 0;
}

function usageDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function secondsUntilUtcMidnight(now: Date): number {
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}
