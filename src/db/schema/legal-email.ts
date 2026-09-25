import {
  bigserial,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { users } from "./index";

/**
 * R10 — i18n, legal & email templates data model.
 *
 * Three additive tables that ship with the R10 remaster
 * (docs/remaster-phase-10-i18n-legal-email.md §2):
 *
 *   legal_acceptances  — checkbox-confirm audit trail for /legal/* pages.
 *                        Records the version the user accepted at the time.
 *
 *   email_unsubscribes — per-(email,category) suppression list. Categories:
 *                        'all', 'marketing', 'engagement', 'live_reminder',
 *                        'qa', 'streak', 'parent_digest'. Transactional
 *                        emails (receipts, grade notifications) cannot be
 *                        unsubscribed from — they are required for compliance.
 *
 *   email_send_log     — every sendEmail() call inserts a row. Used for
 *                        dedupe (UNIQUE dedupe_key), audit retention (90-day
 *                        purge), and the free-tier quota alert (70/day → ops).
 *
 * No PII (raw IPs, full user agents) is stored — `ip_hash` is a SHA-256
 * of cf-connecting-ip so we can answer "did this acceptance come from
 * the same network" without keeping the IP itself.
 */

export const legalAcceptances = pgTable(
  "legal_acceptances",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    docKey: text("doc_key").notNull(),
    version: text("version").notNull(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("legal_acceptances_user_doc_idx").on(
      table.userId,
      table.docKey,
      table.version
    ),
    index("legal_acceptances_doc_version_idx").on(
      table.docKey,
      table.version
    ),
  ]
);

export type LegalAcceptance = typeof legalAcceptances.$inferSelect;
export type NewLegalAcceptance = typeof legalAcceptances.$inferInsert;

export const emailUnsubscribes = pgTable(
  "email_unsubscribes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    email: text("email").notNull(),
    category: text("category").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("email_unsubscribes_email_category_unique").on(
      table.email,
      table.category
    ),
    index("email_unsubscribes_email_idx").on(table.email),
  ]
);

export type EmailUnsubscribe = typeof emailUnsubscribes.$inferSelect;
export type NewEmailUnsubscribe = typeof emailUnsubscribes.$inferInsert;

export const emailSendLog = pgTable(
  "email_send_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    toUserId: text("to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    toEmail: text("to_email").notNull(),
    template: text("template").notNull(),
    category: text("category").notNull(),
    // Stable per-event key (e.g. `grade_posted:<submissionId>:<gradedAt>`).
    // Unique constraint makes sendEmail() a true idempotent operation.
    dedupeKey: text("dedupe_key").notNull(),
    providerId: text("provider_id"),
    status: text("status").notNull().default("queued"),
    payload: jsonb("payload").notNull().default({}),
    locale: text("locale"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("email_send_log_dedupe_key_unique").on(table.dedupeKey),
    index("email_send_log_user_idx").on(table.toUserId, table.createdAt),
    index("email_send_log_template_idx").on(table.template, table.createdAt),
    index("email_send_log_status_idx").on(table.status, table.createdAt),
  ]
);

export type EmailSendLogEntry = typeof emailSendLog.$inferSelect;
export type NewEmailSendLogEntry = typeof emailSendLog.$inferInsert;

/**
 * Email categories. Mirrored as a string enum because the column is TEXT
 * (no PostgreSQL enum yet) and we want to stay flexible as the product
 * evolves. Keep in lockstep with src/i18n `email.category.*` keys.
 */
export const EMAIL_CATEGORIES = [
  "transactional", // receipts, refunds, grade posted — cannot opt out
  "engagement", // streak repairs, Q&A accepted, class reminders
  "marketing", // announcements, newsletters
  "parent_digest", // R7 weekly summary to linked parent
] as const;

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

/** Suppression categories a user can self-toggle on /account/emails. */
export const UNSUBSCRIBEABLE_CATEGORIES = [
  "engagement",
  "marketing",
  "parent_digest",
] as const;

export type UnsubscribeableCategory = (typeof UNSUBSCRIBEABLE_CATEGORIES)[number];
