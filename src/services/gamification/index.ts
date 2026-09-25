/**
 * R5 — Gamification service barrel.
 *
 * Use this single import for the gamification surface:
 *
 *   import { emitGamifiedXp, recordActivity, repairStreak,
 *            evaluateBadge, listBadgesForUser,
 *            computeWeeklyLeagues, getCurrentLeague,
 *            consumeEnergy, refillNow,
 *            emitCelebration } from "@/services/gamification";
 *
 * Sub-modules are kept separate so the test runner can target one
 * concern at a time and so tree-shaking can drop the cron-only code
 * from the worker bundle.
 */
export * from "./xp";
export * from "./streaks";
export * from "./badges";
export * from "./leagues";
export * from "./energy";
export * from "./notifications";