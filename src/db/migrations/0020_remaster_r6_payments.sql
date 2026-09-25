-- R6 — Manual bKash payments, course bundles, and enrollment gate.
--
-- Remaster Phase R6 replaces the original `payment_intents` / bKash API flow
-- with a fully manual transfer + admin approval model. There is NO bKash
-- developer account, NO API integration, NO webhook signature. Students send
-- money from their own bKash app to one of the bKash wallet numbers an admin
-- has whitelisted at /admin/settings/payments, then submit trxID + last-4 +
-- amount; an admin or the course owner marks it approved and access unlocks.
--
-- Tables in this migration:
--   payment_numbers         — admin-managed, multiple, soft-deletable
--   payment_numbers_audit   — audit log of every number add/edit/disable
--   course_bundles          — multiple courses sold together at a discount
--   course_bundle_items     — bundle ↔ course mapping with stable position
--   payment_submissions     — student's claim (replaces payment_intents)
--   payment_receipts        — IJ-YYYY-NNNNNN stable receipt numbers
--   payment_enrollments     — links a submission to the enrollments it created
--   payment_refunds         — manual refund ledger (no API calls)
--
-- `courses` gets two new columns: `price_bdt` (numeric) and
-- `requires_payment` (bool) so the existing enrollment decision flow can
-- gate on them — paid standalone courses require an approved submission.
--
-- The unique index on `payment_submissions` enforces one submission per
-- (user, scope_kind, scope_id) per 10-minute window via an expression index,
-- matching the dedupe shape used in R0's `request_dedupe`.
--
-- All tables are additive. No backfill required. No FK cascade from
-- `payment_submissions.number_id` so historical submissions keep their
-- number reference even after soft-disabling a number.

-- ---------------------------------------------------------------------------
-- 1. payment_numbers — admin-managed, student-visible bKash wallets.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "payment_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"bkash_number" text NOT NULL,
	"holder_name" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"whatsapp_number" text,
	"whatsapp_template" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_numbers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_numbers_status_idx" ON "payment_numbers" USING btree ("status","created_at" DESC NULLS LAST);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2. payment_numbers_audit — append-only audit log.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "payment_numbers_audit" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"number_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_numbers_audit_number_id_payment_numbers_id_fk" FOREIGN KEY ("number_id") REFERENCES "payment_numbers"("id") ON DELETE cascade,
	CONSTRAINT "payment_numbers_audit_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_numbers_audit_number_idx" ON "payment_numbers_audit" USING btree ("number_id","created_at" DESC NULLS LAST);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. course_bundles — multiple courses sold together at a discount.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "course_bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_bdt" numeric(10, 2) NOT NULL,
	"compare_at_bdt" numeric(10, 2),
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "course_bundles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "course_bundles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_bundles_status_idx" ON "course_bundles" USING btree ("status","published_at" DESC NULLS LAST);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 4. course_bundle_items — bundle ↔ course mapping with stable position.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "course_bundle_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bundle_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "course_bundle_items_bundle_id_course_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "course_bundles"("id") ON DELETE cascade,
	CONSTRAINT "course_bundle_items_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE restrict,
	CONSTRAINT "course_bundle_items_bundle_course_unique" UNIQUE("bundle_id","course_id"),
	CONSTRAINT "course_bundle_items_bundle_position_unique" UNIQUE("bundle_id","position")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_bundle_items_bundle_idx" ON "course_bundle_items" USING btree ("bundle_id","position");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 5. courses — add price + requires_payment columns.
-- ---------------------------------------------------------------------------
ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "price_bdt" numeric(10, 2),
  ADD COLUMN IF NOT EXISTS "requires_payment" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 6. payment_submissions — student's claim; replaces payment_intents.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "payment_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"number_id" uuid NOT NULL,
	"scope_kind" text NOT NULL,
	"scope_id" uuid NOT NULL,
	"amount_bdt" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"trx_id" text NOT NULL,
	"sender_last4" text NOT NULL,
	"sender_name" text,
	"payer_note" text,
	"whatsapp_sent" boolean DEFAULT false NOT NULL,
	"screenshot_key" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "payment_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
	CONSTRAINT "payment_submissions_number_id_payment_numbers_id_fk" FOREIGN KEY ("number_id") REFERENCES "payment_numbers"("id") ON DELETE restrict,
	CONSTRAINT "payment_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE set null,
	CONSTRAINT "payment_submissions_sender_last4_format" CHECK ("sender_last4" ~ '^[0-9]{4}$')
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_submissions_user_idx" ON "payment_submissions" USING btree ("user_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_submissions_status_idx" ON "payment_submissions" USING btree ("status","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_submissions_scope_idx" ON "payment_submissions" USING btree ("scope_kind","scope_id");
--> statement-breakpoint
-- Anti-spam: one submission per (user, scope) per 10 minutes.
-- date_bin() is IMMUTABLE; extract(epoch from <timestamptz>) is only STABLE and
-- Postgres refuses to build an index on it, so the original extract/floor form
-- could never be created.
CREATE UNIQUE INDEX IF NOT EXISTS "payment_submissions_dedupe_idx"
  ON "payment_submissions" ("user_id","scope_kind","scope_id", date_bin(interval '600 seconds', "created_at", timestamptz 'epoch'));
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 7. payment_receipts — IJ-YYYY-NNNNNN stable receipt numbers.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "payment_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"receipt_number" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_receipts_submission_unique" UNIQUE("submission_id"),
	CONSTRAINT "payment_receipts_receipt_number_unique" UNIQUE("receipt_number"),
	CONSTRAINT "payment_receipts_submission_id_payment_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "payment_submissions"("id") ON DELETE cascade,
	CONSTRAINT "payment_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_receipts_user_idx" ON "payment_receipts" USING btree ("user_id","issued_at" DESC NULLS LAST);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 8. payment_enrollments — links a submission to the enrollments it created.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "payment_enrollments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"submission_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	CONSTRAINT "payment_enrollments_submission_id_payment_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "payment_submissions"("id") ON DELETE cascade,
	CONSTRAINT "payment_enrollments_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE cascade,
	CONSTRAINT "payment_enrollments_submission_enrollment_unique" UNIQUE("submission_id","enrollment_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_enrollments_submission_idx" ON "payment_enrollments" USING btree ("submission_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 9. payment_refunds — manual refund ledger (no API calls).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "payment_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"amount_bdt" numeric(10, 2) NOT NULL,
	"reason" text,
	"status" text DEFAULT 'requested' NOT NULL,
	"approved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"executed_at" timestamp with time zone,
	"execution_note" text,
	"bkash_refund_trx_id" text,
	"requested_by" text,
	CONSTRAINT "payment_refunds_submission_id_payment_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "payment_submissions"("id") ON DELETE cascade,
	CONSTRAINT "payment_refunds_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE set null,
	CONSTRAINT "payment_refunds_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_refunds_submission_idx" ON "payment_refunds" USING btree ("submission_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_refunds_status_idx" ON "payment_refunds" USING btree ("status","created_at" DESC NULLS LAST);