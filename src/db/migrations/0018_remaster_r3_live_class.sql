-- R3 — Live Class Room (Durable Object + YouTube Live Unlisted).
-- Adds the columns needed by the live class experience to class_sessions
-- and creates the three side tables the DO flushes into:
--
--   class_attendance — server-side per-(session,student) attendance rollup,
--                      flushed by the DO on class end (or last-leave).
--   class_reactions  — analytics + replay timeline (raise_hand, clap, etc.).
--   class_chat       — persisted chat for the post-class replay transcript.
--
-- The replay_status enum is added for the replay lifecycle:
--   'none'      — replay not ready yet (default)
--   'available' — teacher has marked replay ready
--
-- All R3 changes are additive: no destructive ALTER on existing data.
-- The classroomroom Durable Object is wired via wrangler.jsonc; no SQL
-- required for it (DO storage lives in the DO SQLite, not Postgres).

-- ---------------------------------------------------------------------------
-- ALTER class_sessions — YouTube Live + replay + DO + lobby bookkeeping.
-- ---------------------------------------------------------------------------
ALTER TABLE "class_sessions"
  ADD COLUMN "teacher_id" text,
  ADD COLUMN "room_durable_object_id" text,
  ADD COLUMN "youtube_live_video_id" text,
  ADD COLUMN "youtube_replay_video_id" text,
  ADD COLUMN "replay_status" text DEFAULT 'none' NOT NULL,
  ADD COLUMN "max_participants" integer DEFAULT 200 NOT NULL,
  ADD COLUMN "lobby_opens_at" timestamp with time zone,
  ADD COLUMN "ended_at" timestamp with time zone;
--> statement-breakpoint

-- Backfill teacher_id from the owning course. Safe to run multiple times.
UPDATE "class_sessions" cs
   SET "teacher_id" = c."teacher_id"
  FROM "courses" c
 WHERE c."id" = cs."course_id"
   AND cs."teacher_id" IS NULL;
--> statement-breakpoint

CREATE INDEX "class_sessions_scheduled_window_idx"
  ON "class_sessions" USING btree ("scheduled_at","status");
--> statement-breakpoint

CREATE INDEX "class_sessions_teacher_idx"
  ON "class_sessions" USING btree ("teacher_id","scheduled_at" DESC NULLS LAST);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- class_attendance — per-(session,student) attendance rollup.
-- One row per student. UNIQUE so the DO can idempotently UPSERT on every
-- leave. totalSeconds accumulates; leftAt is the last leave timestamp.
-- ---------------------------------------------------------------------------
CREATE TABLE "class_attendance" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"left_at" timestamp with time zone,
	"total_seconds" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'websocket' NOT NULL,
	CONSTRAINT "class_attendance_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE cascade,
	CONSTRAINT "class_attendance_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE cascade
);
--> statement-breakpoint

CREATE UNIQUE INDEX "class_attendance_session_student_unique"
  ON "class_attendance" USING btree ("session_id","student_id");
--> statement-breakpoint

CREATE INDEX "class_attendance_student_idx"
  ON "class_attendance" USING btree ("student_id","joined_at" DESC NULLS LAST);
--> statement-breakpoint

CREATE INDEX "class_attendance_session_idx"
  ON "class_attendance" USING btree ("session_id","total_seconds" DESC NULLS LAST);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- class_reactions — analytics + replay timeline overlay.
-- ---------------------------------------------------------------------------
CREATE TABLE "class_reactions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"reaction" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_reactions_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE cascade,
	CONSTRAINT "class_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
	CONSTRAINT "class_reactions_reaction_check" CHECK ("reaction" IN ('clap','heart','eyes','fire','laugh','raise_hand'))
);
--> statement-breakpoint

CREATE INDEX "class_reactions_session_idx"
  ON "class_reactions" USING btree ("session_id","created_at");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- class_chat — persisted chat for transcript / replay overlay.
-- Soft-delete via deleted_at for moderation reversibility.
-- ---------------------------------------------------------------------------
CREATE TABLE "class_chat" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "class_chat_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE cascade,
	CONSTRAINT "class_chat_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX "class_chat_session_idx"
  ON "class_chat" USING btree ("session_id","created_at");
--> statement-breakpoint

CREATE INDEX "class_chat_user_idx"
  ON "class_chat" USING btree ("user_id","created_at" DESC NULLS LAST);
