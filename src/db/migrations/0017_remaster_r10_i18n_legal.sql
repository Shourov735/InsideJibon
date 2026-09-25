-- R10 — i18n, legal & email templates.
-- Adds the legal and email-delivery audit tables documented in
-- docs/remaster-phase-10-i18n-legal-email.md §2. All three tables are
-- additive: no impact on hot paths, no backfill required.
--
-- legal_acceptances — every checkbox-confirm (e.g. on signup) writes one
--   row; an admin export query hits the (doc_key, version) index.
--
-- email_unsubscribes — global per-(email,category) UNIQUE; webhook-handled
--   one-click unsubscribe link (RFC 8058) is wired in §3.4.
--
-- email_send_log — every sendEmail() call inserts a `queued` row, then
--   updates to `sent` / `failed` / `suppressed`. The 90-day retention
--   purge runs from a Cron Trigger (see wrangler.jsonc, R9 already
--   consumes the 5-slot Free-plan cap; the R10 cron surfaces as an
--   operator action).

CREATE TABLE IF NOT EXISTS "legal_acceptances" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text,
	"doc_key" text NOT NULL,
	"version" text NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "legal_acceptances_user_doc_idx" ON "legal_acceptances" USING btree ("user_id","doc_key","version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "legal_acceptances_doc_version_idx" ON "legal_acceptances" USING btree ("doc_key","version");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "email_unsubscribes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"category" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_unsubscribes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
	CONSTRAINT "email_unsubscribes_email_category_unique" UNIQUE("email","category")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_unsubscribes_email_idx" ON "email_unsubscribes" USING btree ("email");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "email_send_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"to_user_id" text,
	"to_email" text NOT NULL,
	"template" text NOT NULL,
	"category" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"provider_id" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"locale" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_send_log_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE set null,
	CONSTRAINT "email_send_log_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_send_log_user_idx" ON "email_send_log" USING btree ("to_user_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_send_log_template_idx" ON "email_send_log" USING btree ("template","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_send_log_status_idx" ON "email_send_log" USING btree ("status","created_at" DESC NULLS LAST);
