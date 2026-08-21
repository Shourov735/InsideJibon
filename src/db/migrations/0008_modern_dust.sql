CREATE TYPE "public"."session_status" AS ENUM('upcoming', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('live', 'recorded');--> statement-breakpoint
CREATE TABLE "class_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"session_type" "session_type" DEFAULT 'live' NOT NULL,
	"external_url" text,
	"scheduled_at" timestamp with time zone,
	"duration_minutes" integer,
	"status" "session_status" DEFAULT 'upcoming' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_sessions_course_id_idx" ON "class_sessions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "class_sessions_scheduled_at_idx" ON "class_sessions" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "class_sessions_course_status_idx" ON "class_sessions" USING btree ("course_id","status");--> statement-breakpoint
CREATE INDEX "announcements_course_id_idx" ON "announcements" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "announcements_course_published_idx" ON "announcements" USING btree ("course_id","published_at");