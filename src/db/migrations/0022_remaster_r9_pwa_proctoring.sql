-- R9 — Offline PWA, Web Push, and exam proctoring data model.
--
-- Remaster Phase R9 (docs/remaster-phase-9-pwa-proctoring.md) introduces:
--   1. Per-exam proctoring settings on `exams` (fullscreen lock, tab-switch
--      flagging, optional webcam storage reference).
--   2. Denormalized proctoring rollup on `exam_attempts` (flag count, flagged
--      boolean, reviewer + reviewed-at).
--   3. `exam_proctor_events` — append-only per-attempt timeline used by the
--      teacher review rail.
--   4. `web_push_subscriptions` — one row per device VAPID subscription; the
--      fan-out service matches by category.
--   5. `offline_outbox` — offline-buffered writes from the service worker.
--
-- R7's parent_student_links / parent_digest_prefs tables also never reached
-- production (the 0021 hash mismatch left the schema present in code but
-- absent from Neon) — they are added at the tail of this migration so a
-- single idempotent run repairs both phases.
--
-- These columns and tables were declared in `src/db/schema/*.ts` but never
-- migrated to Neon, which is why the teacher dashboard crashed with
-- `column exams.proctor_fullscreen_required does not exist` on every load.
--
-- All CREATE/ALTER statements are idempotent so this migration can be safely
-- re-applied after a partial run (consistent with the AGENTS.md guidance
-- about hand-written migrations being driven statement-by-statement when
-- the journal is already ahead).

-- ---------------------------------------------------------------------------
-- 1. exams — proctoring settings (R9)
-- ---------------------------------------------------------------------------
ALTER TABLE "exams"
  ADD COLUMN IF NOT EXISTS "proctor_fullscreen_required" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "exams"
  ADD COLUMN IF NOT EXISTS "proctor_tab_switch_flag" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE "exams"
  ADD COLUMN IF NOT EXISTS "proctor_webcam_required" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "exams"
  ADD COLUMN IF NOT EXISTS "proctor_webcam_storage_key" text;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2. exam_attempts — denormalized proctoring rollup (R9)
-- ---------------------------------------------------------------------------
ALTER TABLE "exam_attempts"
  ADD COLUMN IF NOT EXISTS "proctor_flag_count" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "exam_attempts"
  ADD COLUMN IF NOT EXISTS "proctor_flagged" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "exam_attempts"
  ADD COLUMN IF NOT EXISTS "proctor_reviewed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "exam_attempts"
  ADD COLUMN IF NOT EXISTS "proctor_reviewed_by" text
    REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. exam_proctor_events — append-only per-attempt timeline (R9)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "exam_proctor_events" (
  "id"         bigserial PRIMARY KEY,
  "attempt_id" uuid NOT NULL REFERENCES "exam_attempts"("id") ON DELETE cascade,
  "user_id"    text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "kind"       text NOT NULL,
  "payload"    jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exam_proctor_events_attempt_idx"
  ON "exam_proctor_events" USING btree ("attempt_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exam_proctor_events_user_idx"
  ON "exam_proctor_events" USING btree ("user_id", "created_at");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 4. web_push_subscriptions — VAPID device subscriptions (R9)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "web_push_subscriptions" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "endpoint"     text NOT NULL,
  "p256dh"       text NOT NULL,
  "auth"         text NOT NULL,
  "user_agent"   text,
  "locale"       text NOT NULL DEFAULT 'en',
  "categories"   text[] NOT NULL DEFAULT ARRAY['live_reminder','grade_posted','qa_replied']::text[],
  "enabled"      boolean NOT NULL DEFAULT true,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "last_used_at" timestamp with time zone,
  CONSTRAINT "web_push_subscriptions_endpoint_unique" UNIQUE ("endpoint")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "web_push_subscriptions_user_enabled_idx"
  ON "web_push_subscriptions" USING btree ("user_id")
  WHERE "enabled" = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "web_push_subscriptions_category_idx"
  ON "web_push_subscriptions" USING gin ("categories");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 5. offline_outbox — service-worker queued writes (R9)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "offline_outbox" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "kind"       text NOT NULL,
  "payload"    jsonb NOT NULL,
  "client_id"  text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "synced_at"  timestamp with time zone,
  CONSTRAINT "offline_outbox_user_client_unique" UNIQUE ("user_id", "client_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offline_outbox_unsynced_idx"
  ON "offline_outbox" USING btree ("synced_at")
  WHERE "synced_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offline_outbox_user_unsynced_idx"
  ON "offline_outbox" USING btree ("user_id", "created_at")
  WHERE "synced_at" IS NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 6. parent_student_links (R7) — many-to-many parent ↔ student with invite
--    token handshake. Single-use token; status: pending → active → revoked.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "parent_student_links" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "parent_id"    text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "student_id"   text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "status"       text NOT NULL DEFAULT 'pending',
  "invite_token" text,
  "invited_at"   timestamp with time zone,
  "accepted_at"  timestamp with time zone,
  "revoked_at"   timestamp with time zone,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
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
-- 7. parent_digest_prefs (R7) — per-(parent, student) cadence + send hour.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "parent_digest_prefs" (
  "parent_id"     text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "student_id"    text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "cadence"       text NOT NULL DEFAULT 'daily',
  "send_hour_utc" smallint NOT NULL DEFAULT 6,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("parent_id", "student_id"),
  CONSTRAINT "parent_digest_prefs_cadence_check"
    CHECK ("cadence" IN ('daily', 'weekly', 'off')),
  CONSTRAINT "parent_digest_prefs_send_hour_check"
    CHECK ("send_hour_utc" BETWEEN 0 AND 23)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parent_digest_prefs_cadence_idx"
  ON "parent_digest_prefs" USING btree ("cadence");
--> statement-breakpoint
