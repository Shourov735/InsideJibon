/**
 * XP event source constants. Centralizing them avoids typo drift between
 * the emitter, the leaderboard recomputer, and the analytics dashboards
 * (R5 retrofits lesson / exam / streak emitters).
 *
 * Convention: lowercase, dot-separated, snake-tail for the action.
 * Rename any of these in v1: emit them once in the same release that
 * consumes the old name (drizzle/Neon stays back-compatible because the
 * `source` column is plain text).
 */
export const XP_SOURCES = {
  QA_UPVOTE: "qa.upvote",
  QA_ACCEPTED: "qa.accepted",
  // Reserved (R5):
  LESSON_COMPLETE: "lesson.complete",
  EXAM_PASS: "exam.pass",
  STREAK_DAY: "streak.day",
} as const;

export type XpSource = (typeof XP_SOURCES)[keyof typeof XP_SOURCES];

/**
 * Award amounts per source. Kept here (not in the call sites) so the
 * gamification tuning happens in one place; R5 may add multipliers
 * (e.g. daily-streak bonus on top of `qa.upvote`).
 */
export const XP_AMOUNTS: Record<XpSource, number> = {
  "qa.upvote": 5,
  "qa.accepted": 25,
  "lesson.complete": 0,
  "exam.pass": 0,
  "streak.day": 0,
};
