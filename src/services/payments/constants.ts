/**
 * R6 — payment domain constants.
 *
 * Single source of truth for the valueless shape sentinels and validation
 * regexes used across the payments domain. Anything that touches
 * `payment_submissions` / `payment_numbers` / `payment_refunds` should
 * import these constants instead of re-declaring a copy.
 */

/** Matches '01712345678' or '8801712345678'. Permissive on grouping — we
 *  strip non-digits before validating. The student-facing input is the
 *  11-digit local form; we also accept international-prefixed 14-digit. */
export const BKASH_LOCAL_RE = /^01\d{9}$/;
export const BKASH_INTL_RE = /^8801\d{9}$/;

export const LAST4_RE = /^[0-9]{4}$/;

/** bKash TrxID: historically `TRX` + 9 alnum, but the field is loose and
 *  accepts any 8–20 char alnum to be safe across `Send Money` receipts. */
export const TRX_ID_RE = /^[A-Za-z0-9]{8,20}$/;

/** Submissions auto-expire if not reviewed within this window. The cron
 *  flips them to `expired` so the queue stops showing them. */
export const SUBMISSION_TTL_HOURS = 48;

export const SUBMISSION_DEDUPE_WINDOW_MIN = 10;

/** Surface in admin queue. */
export const ADMIN_QUEUE_DEFAULT_PAGE_SIZE = 25;

/** Soft ceilings used by the admin queue preflight (no pagination by
 *  default — admin can scroll). */
export const ADMIN_QUEUE_MAX_PAGE_SIZE = 100;
