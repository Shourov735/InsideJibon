CREATE TYPE "public"."exam_attempt_status" AS ENUM('in_progress', 'submitted');--> statement-breakpoint
CREATE TABLE "exam_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_option_id" uuid,
	"awarded_points" integer DEFAULT 0 NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" "exam_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"score" integer,
	"total_points" integer,
	"percentage" double precision,
	"content_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exam_answers_attempt_question_unique" ON "exam_answers" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE INDEX "exam_answers_attempt_id_idx" ON "exam_answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_attempts_exam_student_number_unique" ON "exam_attempts" USING btree ("exam_id","student_id","attempt_number");--> statement-breakpoint
CREATE INDEX "exam_attempts_exam_id_idx" ON "exam_attempts" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "exam_attempts_student_id_idx" ON "exam_attempts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "exam_attempts_exam_student_status_idx" ON "exam_attempts" USING btree ("exam_id","student_id","status");