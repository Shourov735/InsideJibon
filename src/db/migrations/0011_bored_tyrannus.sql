CREATE TYPE "public"."enrollment_status" AS ENUM('pending', 'active', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'enrollment_request' BEFORE 'class_session';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'enrollment_decision' BEFORE 'class_session';--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "status" "enrollment_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "decided_by" text;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enrollments_status_idx" ON "enrollments" USING btree ("status");