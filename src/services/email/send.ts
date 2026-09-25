import "server-only";

import { getDb } from "@/db";
import {
  emailSendLog,
  type EmailCategory,
  type EmailSendLogEntry,
} from "@/db/schema";
import { sendRawEmail, hasEmailRuntime } from "@/lib/cloudflare/email";
import type { Locale } from "@/i18n/config";

import { renderEmail } from "./render";
import { isUnsubscribed } from "./unsubscribe";
import {
  findByDedupeKey,
  markFailed,
  markSent,
  markSuppressed,
} from "./dedupe";
import type { TemplateName } from "@/emails/templates";

/**
 * R10 — `sendEmail` is the only public entry point for transactional
 * email. Direct call sites (R3 reminders, R6 receipts, R7 digest, …)
 * always go through here so dedupe, audit, suppression, and free-tier
 * alerting stay consistent.
 *
 * Flow:
 *   1. dedupe short-circuit (UNIQUE on dedupe_key).
 *   2. suppression check on (email, category).
 *   3. insert `email_send_log` row (status='queued').
 *   4. render email body (HTML + text) via renderEmail().
 *   5. call Cloudflare Email Sending.
 *   6. update row → 'sent' / 'failed' / 'suppressed'.
 *
 * Returns the resulting log row. In Node dev (no binding) the row is
 * still inserted so Q&A tests can audit the call without an actual
 * network round-trip — but the `status` will be `sent` with
 * `provider_id=null` to flag "would-have-sent".
 */

export type SendEmailInput = {
  to: string;
  toUserId?: string | null;
  template: TemplateName;
  /** Append this to the recipient's locale to override the default. */
  locale?: Locale;
  /** Stable per-event id for idempotency. REQUIRED. */
  dedupeKey: string;
  appUrl: string;
  /** Token used to gate one-click unsubscribe links. We use the
   * logged-in session id at send time, but expose the parameter so
   * the R7 weekly digest (sent to a parent) can pass a parent token. */
  manageToken: string;
  ctaUrl?: string;
  ctaLabel?: string;
  payload?: Record<string, unknown>;
  /** Override the inferred category (one of TEMPLATE_STRINGS[*].category). */
  category?: EmailCategory;
  subjectOverride?: string;
  textOverride?: string;
};

export type SendEmailResult = {
  log: EmailSendLogEntry;
  /** Human-readable status, suitable for logging. */
  outcome: "sent" | "suppressed" | "deduplicated" | "failed";
};

export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  // 1. Dedupe short-circuit.
  const existing = await findByDedupeKey(input.dedupeKey);
  if (existing) {
    return { log: existing, outcome: "deduplicated" };
  }

  const locale: Locale = input.locale ?? "en";
  const category: EmailCategory =
    input.category ?? categoryForTemplate(input.template);

  // 2. Suppression check.
  if (category !== "transactional") {
    const suppressed = await isUnsubscribed(input.to, category);
    if (suppressed) {
      const row = await insertLogRow({
        ...input,
        locale,
        status: "suppressed",
        category,
      });
      await markSuppressed({ id: row.id });
      return { log: row, outcome: "suppressed" };
    }
  }

  // 3. Insert queued row.
  const logRow = await insertLogRow({
    ...input,
    locale,
    status: "queued",
    category,
  });

  // 4. Render.
  const rendered = renderEmail({
    template: input.template,
    locale,
    to: input.to,
    appUrl: input.appUrl,
    manageToken: input.manageToken,
    ctaUrl: input.ctaUrl,
    ctaLabel: input.ctaLabel,
    subjectOverride: input.subjectOverride,
    textOverride: input.textOverride,
  });

  // 5. Send.
  try {
    const { messageId } = await sendRawEmail(rendered);
    if (await hasEmailRuntime()) {
      await markSent({ id: logRow.id, providerId: messageId });
    } else {
      // Dev mode: keep status='sent' but flag with no provider id so
      // we can tell test fixtures apart from real sends.
      await markSent({ id: logRow.id, providerId: null });
    }
    const refreshed = await findByDedupeKey(input.dedupeKey);
    return { log: refreshed ?? { ...logRow, status: "sent", providerId: messageId }, outcome: "sent" };
  } catch (error) {
    const reason = (error as Error)?.message ?? "send failed";
    await markFailed({ id: logRow.id, reason });
    const refreshed = await findByDedupeKey(input.dedupeKey);
    return {
      log: refreshed ?? { ...logRow, status: "failed", failureReason: reason },
      outcome: "failed",
    };
  }
}

function categoryForTemplate(
  template: TemplateName
): EmailCategory {
  // Mirror the categories from TEMPLATE_STRINGS. We don't import the
  // module here to keep the lookup explicit & side-effect free.
  switch (template) {
    case "grade-posted":
    case "payment-receipt":
    case "refund-executed":
      return "transactional";
    case "parent-digest":
      return "parent_digest";
    case "enrollment-decision":
    case "class-reminder":
    case "recording-ready":
    case "qa-replied":
    case "qa-accepted":
    case "streak-repair":
    case "ai-tutor-answer":
      return "engagement";
    default:
      return "engagement";
  }
}

async function insertLogRow(input: {
  to: string;
  toUserId?: string | null;
  template: TemplateName;
  dedupeKey: string;
  locale: Locale;
  status: "queued" | "suppressed";
  category: EmailCategory;
  payload?: Record<string, unknown>;
}): Promise<EmailSendLogEntry> {
  const db = getDb();
  try {
    const [row] = await db
      .insert(emailSendLog)
      .values({
        toEmail: input.to,
        toUserId: input.toUserId ?? null,
        template: input.template,
        category: input.category,
        dedupeKey: input.dedupeKey,
        locale: input.locale,
        status: input.status,
        payload: input.payload ?? {},
      })
      .returning();
    return row;
  } catch (error) {
    // 23505 = unique_violation on dedupe_key — race with a parallel
    // sendEmail(). Pull the existing row and surface it as a
    // deduplicated outcome (caller path handles this above; we
    // bubble to be safe).
    const existing = await findByDedupeKey(input.dedupeKey);
    if (existing) return existing;
    throw error;
  }
}
