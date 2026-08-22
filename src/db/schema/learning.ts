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

/**
 * Enrollment lifecycle: a student request starts as `pending`, gains
 * course access when a teacher/admin sets it to `active`, and must
 * re-request after a `rejected` decision.
 */
export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "pending",
  "active",
  "rejected",
]);

/**
 * Student enrollment in a published course. One row per (student, course).
 * Deleting the student removes their enrollments; deleting a course removes
 * its enrollments (draft deletion) — archived courses are never deleted.
 */
export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    status: enrollmentStatusEnum("status").notNull().default("pending"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by").references(() => users.id, {
      onDelete: "set null",
    }),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("enrollments_student_course_unique").on(
      table.studentId,
      table.courseId
    ),
    index("enrollments_status_idx").on(table.status),
  ]
);

/**
 * Per-student, per-lesson learning state. Course progress is derived from
 * these rows (completed / total) and is never stored redundantly.
 */
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastPosition: integer("last_position"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("lesson_progress_student_lesson_unique").on(
      table.studentId,
      table.lessonId
    ),
  ]
);

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;

export type LessonProgress = typeof lessonProgress.$inferSelect;
export type NewLessonProgress = typeof lessonProgress.$inferInsert;
export const lessonComments = pgTable(
  "lesson_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("lesson_comments_lesson_id_idx").on(table.lessonId),
    index("lesson_comments_lesson_created_idx").on(table.lessonId, table.createdAt),
    index("lesson_comments_user_id_idx").on(table.userId),
  ]
);

export type LessonComment = typeof lessonComments.$inferSelect;
export type NewLessonComment = typeof lessonComments.$inferInsert;
