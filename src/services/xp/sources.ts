/**
 * XP event source constants. Centralizing them avoids typo drift between
 * the emitter, the leaderboard recomputer, and the analytics dashboards.
 *
 * Convention: lowercase, dot-separated, snake-tail for the action.
 * Rename any of these in v1: emit them once in the same release that
 * consumes the old name (drizzle/Neon stays back-compatible because the
 * `source` column is plain text).
 *
 * R5 added the gamification source registry in the database; the canonical
 * AMOUNTS are now read at runtime from `xp_sources.default_amount` (see
 * `emitXp`). The values here remain as a fallback for callers that fire
 * before the registry has been seeded (e.g. unit tests, or a brand-new
 * deploy where the cron hasn't run yet) and as the type-level enumeration.
 */
export const XP_SOURCES = {
  QA_UPVOTE: "qa.upvote",
  QA_ACCEPTED: "qa.accepted",
  LESSON_COMPLETE: "lesson.complete",
  EXAM_PASS: "exam.passed",
  EXAM_PERFECT: "exam.perfect",
  LESSON_FIRST_OF_DAY: "lesson.first_of_day",
  ASSIGNMENT_SUBMITTED_ONTIME: "assignment.submitted_ontime",
  ASSIGNMENT_GRADED_A: "assignment.graded_a",
  STREAK_DAY: "streak.day",
  STREAK_WEEK: "streak.week",
  BADGE_UNLOCKED: "badge.unlocked",
  CLASS_ATTENDED_60: "class.attended_60",
} as const;

export type XpSource = (typeof XP_SOURCES)[keyof typeof XP_SOURCES];

/**
 * Award amounts per source. Used as a fallback when `xp_sources` cannot
 * be reached (cold start before seeding, test sandbox without DB). On the
 * hot path the service layer reads the DB row instead — keep these in
 * sync with the migration `0015_remaster_r5_gamification` seeds.
 */
export const XP_AMOUNTS: Record<XpSource, number> = {
  "qa.upvote": 5,
  "qa.accepted": 25,
  "lesson.complete": 10,
  "exam.passed": 50,
  "exam.perfect": 100,
  "lesson.first_of_day": 15,
  "assignment.submitted_ontime": 20,
  "assignment.graded_a": 30,
  "streak.day": 2,
  "streak.week": 25,
  "badge.unlocked": 0,
  "class.attended_60": 40,
};