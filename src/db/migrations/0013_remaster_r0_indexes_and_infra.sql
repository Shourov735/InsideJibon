CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"subject_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_dedupe" (
	"key" text PRIMARY KEY NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_actor_created_idx" ON "audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_action_created_idx" ON "audit_log" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "request_dedupe_expires_idx" ON "request_dedupe" USING btree ("expires_at");--> statement-breakpoint
-- Remaster R0 supplementary indexes (defense-in-depth for hot paths identified
-- in the audit). All are idempotent and safe to run on already-populated tables.
-- NOTE: notifications_user_created_idx already exists in 0007; do not duplicate.
CREATE INDEX IF NOT EXISTS "enrollments_student_status_idx"
  ON "enrollments" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_decided_by_idx"
  ON "enrollments" USING btree ("decided_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exam_attempts_submitted_at_idx"
  ON "exam_attempts" USING btree ("submitted_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_status_published_idx"
  ON "courses" USING btree ("status","published_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignment_submissions_assignment_status_idx"
  ON "assignment_submissions" USING btree ("assignment_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "class_sessions_status_scheduled_idx"
  ON "class_sessions" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "materials_lesson_created_idx"
  ON "materials" USING btree ("lesson_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignment_submission_files_filename_idx"
  ON "assignment_submission_files" USING btree ("original_filename");