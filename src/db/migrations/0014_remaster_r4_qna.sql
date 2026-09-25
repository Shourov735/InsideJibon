CREATE TABLE "leaderboard_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"scope_kind" text NOT NULL,
	"scope_id" text,
	"week_start" date NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entries" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qa_votes" (
	"thread_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"value" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qa_votes_thread_id_user_id_pk" PRIMARY KEY("thread_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "xp_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"amount" integer NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "lesson_comments_lesson_id_idx";--> statement-breakpoint
DROP INDEX "lesson_comments_lesson_created_idx";--> statement-breakpoint
DROP INDEX "lesson_comments_user_id_idx";--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "kind" text DEFAULT 'question' NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "status" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "accepted_answer_id" uuid;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "upvotes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "downvotes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "pinned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "pinned_by" text;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "locked_by" text;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD COLUMN "search_tsv" text;--> statement-breakpoint
ALTER TABLE "qa_votes" ADD CONSTRAINT "qa_votes_thread_id_lesson_comments_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."lesson_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_votes" ADD CONSTRAINT "qa_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_scope_week_unique" ON "leaderboard_snapshots" USING btree ("scope_kind","scope_id","week_start");--> statement-breakpoint
CREATE INDEX "leaderboard_scope_week_idx" ON "leaderboard_snapshots" USING btree ("scope_kind","scope_id","week_start");--> statement-breakpoint
CREATE INDEX "qa_votes_user_idx" ON "qa_votes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "xp_events_user_idx" ON "xp_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "xp_events_source_idx" ON "xp_events" USING btree ("source","created_at");--> statement-breakpoint
CREATE INDEX "xp_events_user_source_created_idx" ON "xp_events" USING btree ("user_id","source","created_at");--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD CONSTRAINT "lesson_comments_pinned_by_users_id_fk" FOREIGN KEY ("pinned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD CONSTRAINT "lesson_comments_locked_by_users_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_comments" ADD CONSTRAINT "lesson_comments_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lesson_comments_lesson_status_idx" ON "lesson_comments" USING btree ("lesson_id","status","created_at");--> statement-breakpoint
CREATE INDEX "lesson_comments_parent_idx" ON "lesson_comments" USING btree ("parent_id","created_at");--> statement-breakpoint
CREATE INDEX "lesson_comments_user_idx" ON "lesson_comments" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "lesson_comments_pinned_idx" ON "lesson_comments" USING btree ("lesson_id","pinned","created_at");--> statement-breakpoint
CREATE INDEX "lesson_comments_deleted_at_idx" ON "lesson_comments" USING btree ("deleted_at");--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- R4 custom extensions (search trigger, GIN index on search_tsv,
-- kind backfill for legacy rows, search_tsv backfill, tsvector type fix).
-- drizzle-kit's auto-generated diff doesn't cover plpgsql functions or
-- tsvector columns, so we apply them here as raw SQL.
-- ----------------------------------------------------------------------------

-- Convert search_tsv from text (drizzle's default for unknown types) to
-- the proper tsvector type. Safe because the column was just added and is
-- entirely NULL on existing rows.
ALTER TABLE "lesson_comments"
  ALTER COLUMN "search_tsv" TYPE tsvector USING "search_tsv"::tsvector;--> statement-breakpoint

-- GIN index for tsvector full-text search (used by the `searchQuestions`
-- service when no Vectorize index is available yet).
CREATE INDEX IF NOT EXISTS "lesson_comments_search_idx"
  ON "lesson_comments" USING gin ("search_tsv");--> statement-breakpoint

-- Backfill: legacy rows from the Phase 8 flat comment thread are tagged
-- as `comment_legacy` so the Q&A UI can render them with a slightly
-- different chrome (no upvote / accept affordance). New question rows
-- default to `kind='question'` per the column default.
UPDATE "lesson_comments"
   SET "kind" = 'comment_legacy'
 WHERE "kind" = 'question'
   AND "parent_id" IS NULL
   AND "title" IS NULL;--> statement-breakpoint

-- Search trigger: keep `search_tsv` in sync with title/content writes.
CREATE OR REPLACE FUNCTION "qa_threads_search_update"() RETURNS trigger AS $$
BEGIN
  NEW."search_tsv" :=
    setweight(to_tsvector('simple', coalesce(NEW."title",   '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."content", '')), 'B');
  RETURN NEW;
END $$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS "qa_threads_search_update_trg" ON "lesson_comments";--> statement-breakpoint
CREATE TRIGGER "qa_threads_search_update_trg"
  BEFORE INSERT OR UPDATE OF "title","content" ON "lesson_comments"
  FOR EACH ROW EXECUTE FUNCTION "qa_threads_search_update"();--> statement-breakpoint

-- Backfill search_tsv for existing rows so ILIKE-style tsvector search
-- works immediately after the migration.
UPDATE "lesson_comments"
   SET "search_tsv" =
       setweight(to_tsvector('simple', coalesce("title",   '')), 'A') ||
       setweight(to_tsvector('simple', coalesce("content", '')), 'B')
 WHERE "search_tsv" IS NULL;