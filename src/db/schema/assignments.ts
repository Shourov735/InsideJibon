import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { courses, lessons, users } from "./index";

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "draft",
  "published",
  "closed",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "not_submitted",
  "draft",
  "submitted",
  "graded",
]);

/**
 * A teacher-authored assignment attached to one of their courses.
 *
 * Ownership is NOT duplicated here: it is derived through
 * assignment → course → course.teacherId.
 *
 * Lifecycle mirrors the course/exam lifecycle:
 * draft → published → closed.
 * Published assignments are visible to enrolled students.
 * Closed assignments no longer accept submissions (but graded ones remain viewable).
 */
export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").references(() => lessons.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    instructions: text("instructions").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    maxPoints: integer("max_points").notNull().default(100),
    allowLateSubmission: boolean("allow_late_submission").notNull().default(false),
    allowedFileTypes: text("allowed_file_types")
      .array()
      .notNull()
      .default([]),
    maxFileSize: integer("max_file_size").notNull().default(25 * 1024 * 1024),
    status: assignmentStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("assignments_course_id_idx").on(table.courseId),
    index("assignments_lesson_id_idx").on(table.lessonId),
    index("assignments_status_idx").on(table.status),
    index("assignments_due_at_idx").on(table.dueAt),
    index("assignments_course_status_idx").on(table.courseId, table.status),
  ]
);

/**
 * A student's submission for an assignment.
 *
 * One logical submission per (assignment, student). Resubmissions update
 * this row rather than creating new rows. Status transitions:
 * not_submitted → draft → submitted → graded
 *
 * The server determines `isLate` at submission time by comparing
 * `submittedAt` with the assignment's `dueAt` — never trust client time.
 */
export const assignmentSubmissions = pgTable(
  "assignment_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: submissionStatusEnum("status").notNull().default("not_submitted"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    isLate: boolean("is_late").notNull().default(false),
    points: integer("points"),
    feedback: text("feedback"),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    gradedBy: text("graded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("assignment_submissions_assignment_student_unique").on(
      table.assignmentId,
      table.studentId
    ),
    index("assignment_submissions_assignment_id_idx").on(table.assignmentId),
    index("assignment_submissions_student_id_idx").on(table.studentId),
    index("assignment_submissions_status_idx").on(table.status),
  ]
);

/**
 * Files attached to a submission.
 *
 * Stored in R2 via the storage abstraction. The storage_key is internal
 * and never returned to clients. Deleting a submission cascades these
 * rows; the corresponding R2 objects are cleaned up best-effort by the
 * services layer.
 */
export const assignmentSubmissionFiles = pgTable(
  "assignment_submission_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => assignmentSubmissions.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("assignment_submission_files_storage_key_unique").on(
      table.storageKey
    ),
    index("assignment_submission_files_submission_id_idx").on(
      table.submissionId
    ),
  ]
);

export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type AssignmentStatus = Assignment["status"];

export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type NewAssignmentSubmission = typeof assignmentSubmissions.$inferInsert;
export type SubmissionStatus = AssignmentSubmission["status"];

export type AssignmentSubmissionFile = typeof assignmentSubmissionFiles.$inferSelect;
export type NewAssignmentSubmissionFile = typeof assignmentSubmissionFiles.$inferInsert;