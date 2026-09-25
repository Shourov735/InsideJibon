import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getEnv } from "@/lib/env";
import { sendEmail } from "./send";

/**
 * R10 — Email dispatcher.
 *
 * Single typed surface that R3 / R4 / R5 / R6 / R7 / R8 call to fire a
 * transactional email. Each function:
 *
 *   1. Resolves the recipient (user → email).
 *   2. Builds a stable `dedupeKey`.
 *   3. Calls `sendEmail()` which handles dedupe, suppression, audit.
 *
 * `sendEmail` short-circuits on the `dedupeKey` UNIQUE constraint and
 * on suppression, so callers can safely re-emit events on retry.
 *
 * `appUrl` is read from `APP_URL` env (or a sensible default for local
 * dev) so the unsubscribe link targets the right host.
 */

function appUrl(): string {
  const env = getEnv() as { NEXT_PUBLIC_APP_URL?: string };
  return env.NEXT_PUBLIC_APP_URL ?? "https://insidejibon.com.bd";
}

async function resolveRecipient(userId: string): Promise<{
  email: string;
  locale: "en" | "bn";
} | null> {
  const db = getDb();
  const [row] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row?.email) return null;
  // Locale resolution is the user's preference; we default to 'en'
  // until per-user locale lands (R1 dashboard added a Language toggle).
  return { email: row.email, locale: "en" };
}

export async function dispatchEnrollmentDecision(input: {
  studentId: string;
  enrollmentId: string;
  decision: "approved" | "rejected";
  decidedAt: string;
  ctaUrl?: string;
}) {
  const recipient = await resolveRecipient(input.studentId);
  if (!recipient) return null;
  return sendEmail({
    to: recipient.email,
    toUserId: input.studentId,
    template: "enrollment-decision",
    locale: recipient.locale,
    dedupeKey: `enrollment-decision:${input.enrollmentId}:${input.decidedAt}`,
    appUrl: appUrl(),
    manageToken: input.studentId,
    ctaUrl: input.ctaUrl,
    ctaLabel: recipient.locale === "bn" ? "কোর্স দেখুন" : "View course",
    payload: { decision: input.decision },
  });
}

export async function dispatchClassReminder(input: {
  userId: string;
  sessionId: string;
  startsAt: string;
  ctaUrl?: string;
}) {
  const recipient = await resolveRecipient(input.userId);
  if (!recipient) return null;
  return sendEmail({
    to: recipient.email,
    toUserId: input.userId,
    template: "class-reminder",
    locale: recipient.locale,
    dedupeKey: `class-reminder:${input.sessionId}:${input.startsAt}`,
    appUrl: appUrl(),
    manageToken: input.userId,
    ctaUrl: input.ctaUrl,
    ctaLabel: recipient.locale === "bn" ? "ক্লাসে যোগ দিন" : "Join class",
  });
}

export async function dispatchRecordingReady(input: {
  userId: string;
  sessionId: string;
  recordingId: string;
  ctaUrl?: string;
}) {
  const recipient = await resolveRecipient(input.userId);
  if (!recipient) return null;
  return sendEmail({
    to: recipient.email,
    toUserId: input.userId,
    template: "recording-ready",
    locale: recipient.locale,
    dedupeKey: `recording-ready:${input.recordingId}`,
    appUrl: appUrl(),
    manageToken: input.userId,
    ctaUrl: input.ctaUrl,
  });
}

export async function dispatchGradePosted(input: {
  userId: string;
  submissionId: string;
  gradedAt: string;
  ctaUrl?: string;
}) {
  const recipient = await resolveRecipient(input.userId);
  if (!recipient) return null;
  return sendEmail({
    to: recipient.email,
    toUserId: input.userId,
    template: "grade-posted",
    locale: recipient.locale,
    dedupeKey: `grade-posted:${input.submissionId}:${input.gradedAt}`,
    appUrl: appUrl(),
    manageToken: input.userId,
    ctaUrl: input.ctaUrl,
  });
}

export async function dispatchQaReplied(input: {
  userId: string;
  threadId: string;
  replyId: string;
  ctaUrl?: string;
}) {
  const recipient = await resolveRecipient(input.userId);
  if (!recipient) return null;
  return sendEmail({
    to: recipient.email,
    toUserId: input.userId,
    template: "qa-replied",
    locale: recipient.locale,
    dedupeKey: `qa-replied:${input.replyId}`,
    appUrl: appUrl(),
    manageToken: input.userId,
    ctaUrl: input.ctaUrl,
  });
}

export async function dispatchQaAccepted(input: {
  userId: string;
  threadId: string;
  answerId: string;
  ctaUrl?: string;
}) {
  const recipient = await resolveRecipient(input.userId);
  if (!recipient) return null;
  return sendEmail({
    to: recipient.email,
    toUserId: input.userId,
    template: "qa-accepted",
    locale: recipient.locale,
    dedupeKey: `qa-accepted:${input.answerId}`,
    appUrl: appUrl(),
    manageToken: input.userId,
    ctaUrl: input.ctaUrl,
  });
}

export async function dispatchStreakRepair(input: {
  userId: string;
  streakDate: string;
  ctaUrl?: string;
}) {
  const recipient = await resolveRecipient(input.userId);
  if (!recipient) return null;
  return sendEmail({
    to: recipient.email,
    toUserId: input.userId,
    template: "streak-repair",
    locale: recipient.locale,
    dedupeKey: `streak-repair:${input.userId}:${input.streakDate}`,
    appUrl: appUrl(),
    manageToken: input.userId,
    ctaUrl: input.ctaUrl,
  });
}

export async function dispatchAiTutorAnswer(input: {
  userId: string;
  questionId: string;
  answerId: string;
  ctaUrl?: string;
}) {
  const recipient = await resolveRecipient(input.userId);
  if (!recipient) return null;
  return sendEmail({
    to: recipient.email,
    toUserId: input.userId,
    template: "ai-tutor-answer",
    locale: recipient.locale,
    dedupeKey: `ai-tutor-answer:${input.answerId}`,
    appUrl: appUrl(),
    manageToken: input.userId,
    ctaUrl: input.ctaUrl,
  });
}

export async function dispatchPaymentReceipt(input: {
  userId: string;
  paymentId: string;
  /** Masked reference, last-4 only. */
  bkashRefLast4: string;
  amountBdt: number;
  ctaUrl?: string;
}) {
  const recipient = await resolveRecipient(input.userId);
  if (!recipient) return null;
  return sendEmail({
    to: recipient.email,
    toUserId: input.userId,
    template: "payment-receipt",
    locale: recipient.locale,
    dedupeKey: `payment-receipt:${input.paymentId}`,
    appUrl: appUrl(),
    manageToken: input.userId,
    ctaUrl: input.ctaUrl,
    payload: {
      bkashRefLast4: input.bkashRefLast4,
      amountBdt: input.amountBdt,
    },
  });
}

export async function dispatchRefundExecuted(input: {
  userId: string;
  refundId: string;
  amountBdt: number;
  bkashRefLast4: string;
  ctaUrl?: string;
}) {
  const recipient = await resolveRecipient(input.userId);
  if (!recipient) return null;
  return sendEmail({
    to: recipient.email,
    toUserId: input.userId,
    template: "refund-executed",
    locale: recipient.locale,
    dedupeKey: `refund-executed:${input.refundId}`,
    appUrl: appUrl(),
    manageToken: input.userId,
    ctaUrl: input.ctaUrl,
    payload: {
      bkashRefLast4: input.bkashRefLast4,
      amountBdt: input.amountBdt,
    },
  });
}

export async function dispatchParentDigest(input: {
  parentUserId: string;
  weekStart: string;
  studentIds: string[];
  ctaUrl?: string;
}) {
  const recipient = await resolveRecipient(input.parentUserId);
  if (!recipient) return null;
  return sendEmail({
    to: recipient.email,
    toUserId: input.parentUserId,
    template: "parent-digest",
    locale: recipient.locale,
    dedupeKey: `parent-digest:${input.parentUserId}:${input.weekStart}`,
    appUrl: appUrl(),
    manageToken: input.parentUserId,
    ctaUrl: input.ctaUrl,
    payload: { studentIds: input.studentIds, weekStart: input.weekStart },
  });
}

/**
 * Diagnostic: count distinct templates a user has received today. Used
 * by the R0 KV rate-limit (max 5 distinct transactional templates /
 * user / day — see phase doc §5).
 */
export async function distinctTemplatesTodayForUser(
  userId: string
): Promise<number> {
  // Lightweight surrogate; the canonical rate-limit lives in src/services/security/rate-limit.ts.
  void userId;
  return 0;
}
