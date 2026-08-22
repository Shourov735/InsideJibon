CREATE TYPE "public"."course_category" AS ENUM('physics', 'chemistry', 'biology', 'mathematics', 'english', 'bangla', 'general_science', 'ict', 'other');--> statement-breakpoint
ALTER TYPE "public"."question_type" ADD VALUE 'true_false';--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "category" "course_category";--> statement-breakpoint
CREATE INDEX "courses_category_idx" ON "courses" USING btree ("category");