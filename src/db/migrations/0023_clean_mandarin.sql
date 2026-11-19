-- R8 — AI Tutor, Vectorize chunks, and Quiz drafts data model
CREATE TABLE IF NOT EXISTS "ai_quiz_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE cascade,
	"lesson_id" uuid REFERENCES "lessons"("id") ON DELETE set null,
	"teacher_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_tutor_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE cascade,
	"lesson_id" uuid REFERENCES "lessons"("id") ON DELETE set null,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lang" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_tutor_usage" (
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"usage_day" date NOT NULL,
	"questions" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_tutor_usage_user_id_usage_day_pk" PRIMARY KEY("user_id","usage_day")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_chunks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"lesson_id" uuid NOT NULL REFERENCES "lessons"("id") ON DELETE cascade,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"token_count" integer NOT NULL,
	"vector_id" text NOT NULL,
	"source_kind" text DEFAULT 'youtube_caption' NOT NULL,
	"source_lang" text DEFAULT 'en' NOT NULL,
	"start_sec" integer,
	"end_sec" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_tutor_messages_user_idx" ON "ai_tutor_messages" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_tutor_messages_course_idx" ON "ai_tutor_messages" USING btree ("course_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_tutor_usage_user_idx" ON "ai_tutor_usage" USING btree ("user_id","usage_day");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_chunks_lesson_chunk_unique" ON "lesson_chunks" USING btree ("lesson_id","chunk_index");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_chunks_lesson_idx" ON "lesson_chunks" USING btree ("lesson_id");
