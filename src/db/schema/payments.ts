/**
 * R6 — Manual bKash payments, course bundles, and the enrollment gate.
 *
 * The schema here replaces the old `payment_intents` / bKash-API flow with a
 * fully manual transfer + admin-approval model. The `lessons.video_provider`
 * enum (R2) and the existing `enrollments` table stay untouched; this module
 * only adds what R6 needs and links to enrollments via `payment_enrollments`.
 *
 * Status state machines:
 *   payment_submissions.status: submitted → under_review → approved|rejected|expired
 *                                              ↘ refunded
 *   payment_refunds.status:      requested → approved → executed|rejected
 */

import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { courses } from "./courses";
import { enrollments } from "./learning";
import { users } from "./users";

/**
 * Admin-managed bKash wallet numbers. Student checkout only sees rows with
 * `status='active'`; admins see all rows (incl. disabled). Soft-disable is
 * the operator action of choice so historical submissions keep their FK.
 */
export const paymentNumbers = pgTable(
  "payment_numbers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    label: text("label").notNull(),
    bkashNumber: text("bkash_number").notNull(),
    holderName: text("holder_name").notNull(),
    instructions: text("instructions").notNull().default(""),
    whatsappNumber: text("whatsapp_number"),
    whatsappTemplate: text("whatsapp_template"),
    /** 'active' | 'disabled' */
    status: text("status").notNull().default("active"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payment_numbers_status_idx").on(table.status, table.createdAt),
  ]
);

/** Audit log of every change to a `payment_numbers` row. Append-only. */
export const paymentNumbersAudit = pgTable(
  "payment_numbers_audit",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    numberId: uuid("number_id")
      .notNull()
      .references(() => paymentNumbers.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** 'created' | 'edited' | 'disabled' | 're-enabled' */
    action: text("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payment_numbers_audit_number_idx").on(
      table.numberId,
      table.createdAt
    ),
  ]
);

/**
 * Course bundles: a paid grouping of multiple courses sold together at a
 * discount. The same shape was originally planned pre-remaster; R6 keeps
 * it without any bKash-API-specific code.
 */
export const courseBundles = pgTable(
  "course_bundles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    priceBdt: numeric("price_bdt", { precision: 10, scale: 2 }).notNull(),
    compareAtBdt: numeric("compare_at_bdt", { precision: 10, scale: 2 }),
    /** 'draft' | 'published' | 'archived' */
    status: text("status").notNull().default("draft"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("course_bundles_slug_unique").on(table.slug),
    index("course_bundles_status_idx").on(table.status, table.publishedAt),
  ]
);

/** Many-to-many: bundle ↔ course with a stable position for display order. */
export const courseBundleItems = pgTable(
  "course_bundle_items",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    bundleId: uuid("bundle_id")
      .notNull()
      .references(() => courseBundles.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("course_bundle_items_bundle_course_unique").on(
      table.bundleId,
      table.courseId
    ),
    uniqueIndex("course_bundle_items_bundle_position_unique").on(
      table.bundleId,
      table.position
    ),
    index("course_bundle_items_bundle_idx").on(table.bundleId, table.position),
  ]
);

/**
 * A student's claim that they sent money. Replaces the old `payment_intents`
 * table that assumed a bKash API round-trip. The `dedupe_idx` (defined in
 * the migration) enforces one submission per (user, scope) per 10 minutes
 * to bound server-action abuse.
 *
 * `amount_bdt` is the *claimed* amount — the server validates it matches
 * the listed price for the scope on insert. TrxID, sender_last4 and
 * sender_name are the only PII we hold (no full bKash number stored).
 */
export const paymentSubmissions = pgTable(
  "payment_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    numberId: uuid("number_id")
      .notNull()
      .references(() => paymentNumbers.id, { onDelete: "restrict" }),
    /** 'bundle' | 'course' */
    scopeKind: text("scope_kind").notNull(),
    /** bundle_id or course_id (UUID). */
    scopeId: uuid("scope_id").notNull(),
    amountBdt: numeric("amount_bdt", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("BDT"),
    trxId: text("trx_id").notNull(),
    senderLast4: text("sender_last4").notNull(),
    senderName: text("sender_name"),
    payerNote: text("payer_note"),
    whatsappSent: boolean("whatsapp_sent").notNull().default(false),
    screenshotKey: text("screenshot_key"),
    /** 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired' | 'refunded' */
    status: text("status").notNull().default("submitted"),
    reviewedBy: text("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** created_at + 48h — submission auto-expires if not reviewed by then. */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("payment_submissions_user_idx").on(table.userId, table.createdAt),
    index("payment_submissions_status_idx").on(table.status, table.createdAt),
    index("payment_submissions_scope_idx").on(
      table.scopeKind,
      table.scopeId
    ),
    // Dedupe unique index lives in the migration so the expression index
    // shape is explicit and survives a future `drizzle-kit push` round-trip.
  ]
);

/**
 * Stable, human-readable receipt number issued at approval time. Format:
 *   IJ-{YEAR}-{6-digit-zero-padded sequence}
 * The sequence is sourced per-year from `payment_receipts` ordered by id;
 * receipt_number is UNIQUE.
 */
export const paymentReceipts = pgTable(
  "payment_receipts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => paymentSubmissions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiptNumber: text("receipt_number").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("payment_receipts_submission_unique").on(table.submissionId),
    uniqueIndex("payment_receipts_receipt_number_unique").on(
      table.receiptNumber
    ),
    index("payment_receipts_user_idx").on(table.userId, table.issuedAt),
  ]
);

/**
 * Many-to-many: which enrollments a submission created. Approval flow uses
 * this to (a) skip re-enrollment if the student was already enrolled, and
 * (b) drive the `hasAccessToCourse` hot path so we don't need a heavy join.
 */
export const paymentEnrollments = pgTable(
  "payment_enrollments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => paymentSubmissions.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("payment_enrollments_submission_enrollment_unique").on(
      table.submissionId,
      table.enrollmentId
    ),
    index("payment_enrollments_submission_idx").on(table.submissionId),
  ]
);

/**
 * Manual refund ledger. Admin issues the refund themselves from their own
 * bKash app, then records the outgoing trxID + a free-text note. No API
 * call is ever made to bKash from this codebase.
 */
export const paymentRefunds = pgTable(
  "payment_refunds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => paymentSubmissions.id, { onDelete: "cascade" }),
    amountBdt: numeric("amount_bdt", { precision: 10, scale: 2 }).notNull(),
    reason: text("reason"),
    /** 'requested' | 'approved' | 'executed' | 'rejected' */
    status: text("status").notNull().default("requested"),
    approvedBy: text("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    requestedBy: text("requested_by").references(() => users.id, {
      onDelete: "set null",
    }),
    bkashRefundTrxId: text("bkash_refund_trx_id"),
    executionNote: text("execution_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
  },
  (table) => [
    index("payment_refunds_submission_idx").on(
      table.submissionId,
      table.createdAt
    ),
    index("payment_refunds_status_idx").on(table.status, table.createdAt),
  ]
);

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type PaymentNumber = typeof paymentNumbers.$inferSelect;
export type NewPaymentNumber = typeof paymentNumbers.$inferInsert;
export type PaymentNumberStatus = "active" | "disabled";

export type PaymentNumberAudit = typeof paymentNumbersAudit.$inferSelect;
export type NewPaymentNumberAudit = typeof paymentNumbersAudit.$inferInsert;

export type CourseBundle = typeof courseBundles.$inferSelect;
export type NewCourseBundle = typeof courseBundles.$inferInsert;
export type CourseBundleStatus = "draft" | "published" | "archived";

export type CourseBundleItem = typeof courseBundleItems.$inferSelect;
export type NewCourseBundleItem = typeof courseBundleItems.$inferInsert;

export type PaymentSubmission = typeof paymentSubmissions.$inferSelect;
export type NewPaymentSubmission = typeof paymentSubmissions.$inferInsert;
export type PaymentSubmissionStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "expired"
  | "refunded";

export type PaymentReceipt = typeof paymentReceipts.$inferSelect;
export type NewPaymentReceipt = typeof paymentReceipts.$inferInsert;

export type PaymentEnrollment = typeof paymentEnrollments.$inferSelect;
export type NewPaymentEnrollment = typeof paymentEnrollments.$inferInsert;

export type PaymentRefund = typeof paymentRefunds.$inferSelect;
export type NewPaymentRefund = typeof paymentRefunds.$inferInsert;
export type PaymentRefundStatus = "requested" | "approved" | "executed" | "rejected";
