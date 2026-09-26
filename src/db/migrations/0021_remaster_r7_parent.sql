-- R7 — Parent Panel & Linked Accounts.
--
-- Remaster Phase R7 introduces a parent role and a parent ↔ student link
-- table so a parent can ask to see their child's learning progress,
-- approve the request, and receive a daily / weekly digest by email.
-- See docs/remaster-phase-7-parent-panel.md §2 and §3.
--
-- Three changes:
--
--   1. The existing `role` PG enum gains a 'parent' value. We use
--      `ALTER TYPE ... ADD VALUE IF NOT EXISTS` so the migration is
--      idempotent and safe to re-run after partial application.
--      `drizzle-orm/pg-core`'s pgEnum declares the same expanded set,
--      so the schema definition and the database column stay in
--      lockstep (no TEXT-cast escape hatch needed).
--
--   2. `parent_student_links` — many-to-many parent ↔ student with an
--      invitation token flow (status: pending → active, with the
--      single-use token emailed to the student when the parent
--      initiates).
--
--   3. `parent_digest_prefs` — per (parent, student) cadence (daily,
--      weekly, off) and send_hour_utc. Used by the cron jobs in §3.3.

-- ---------------------------------------------------------------------------
-- 1. Extend the `role` enum with 'parent'. IF NOT EXISTS makes the
--    statement safe to re-run on partially-applied databases — if the
--    first attempt committed the ALTER TYPE before failing on the
--    CREATE TABLEs below, the second attempt won't error out.
-- ---------------------------------------------------------------------------
ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'parent';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2. parent_student_links.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "parent_student_links" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "parent_id"    text NOT NULL,
  "student_id"   text NOT NULL,
  "status"       text NOT NULL DEFAULT 'pending',
  "invite_token" text,
  "invited_at"   timestamp with time zone,
  "accepted_at"  timestamp with time zone,
  "revoked_at"   timestamp with time zone,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "parent_student_links_parent_id_users_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE cascade,
  CONSTRAINT "parent_student_links_student_id_users_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE cascade,
  CONSTRAINT "parent_student_links_parent_student_unique"
    UNIQUE ("parent_id", "student_id"),
  CONSTRAINT "parent_student_links_status_check"
    CHECK ("status" IN ('pending', 'active', 'revoked'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parent_student_links_parent_status_idx"
  ON "parent_student_links" USING btree ("parent_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parent_student_links_student_status_idx"
  ON "parent_student_links" USING btree ("student_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parent_student_links_token_idx"
  ON "parent_student_links" USING btree ("invite_token")
  WHERE "invite_token" IS NOT NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. parent_digest_prefs.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "parent_digest_prefs" (
  "parent_id"      text NOT NULL,
  "student_id"     text NOT NULL,
  "cadence"        text NOT NULL DEFAULT 'daily',
  "send_hour_utc"  smallint NOT NULL DEFAULT 6,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("parent_id", "student_id"),
  CONSTRAINT "parent_digest_prefs_parent_id_users_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE cascade,
  CONSTRAINT "parent_digest_prefs_student_id_users_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE cascade,
  CONSTRAINT "parent_digest_prefs_cadence_check"
    CHECK ("cadence" IN ('daily', 'weekly', 'off')),
  CONSTRAINT "parent_digest_prefs_send_hour_check"
    CHECK ("send_hour_utc" BETWEEN 0 AND 23)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parent_digest_prefs_cadence_idx"
  ON "parent_digest_prefs" USING btree ("cadence");
--> statement-breakpoint
