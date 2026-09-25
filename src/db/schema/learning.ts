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

import { sql } from "drizzle-orm";

import { courses } from "./courses";
import { lessons } from "./courses";
import { users } from "./users";

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
    index("enrollments_course_status_idx").on(table.courseId, table.status),
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

/**
 * R4 Doubt Q&A.
 *
 * The legacy flat comment thread (`lesson_comments`, Phase 8) has been
 * extended in place into a Stack-Overflow-style Q&A model: questions
 * with a `title`, threaded answers (`kind='answer'`), follow-up
 * comments (`kind='comment'`), upvotes/downvotes, accepted answer,
 * pin/lock/soft-delete. The DB table name stays `lesson_comments` for
 * backward compatibility with existing index names and views; the
 * service layer exposes it as `qaThreads` via the re-export in
 * `@/db/schema/qna`.
 *
 * `kind` values (no DB-level enum to keep migrations simple — enforced
 * in the service layer):
 *   - 'question'       : top-level doubt posted by a student/teacher
 *   - 'answer'         : reply to a question; can be accepted
 *   - 'comment'        : follow-up chatter on a question OR an answer
 *   - 'comment_legacy' : backfilled rows from the original flat thread
 */
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
    /** 'question' | 'answer' | 'comment' | 'comment_legacy' */
    kind: text("kind").notNull().default("question"),
    /** NULL on top-level questions; set on answers/comments. */
    parentId: uuid("parent_id"),
    /** Required for kind='question'; null on replies. */
    title: text("title"),
    /** 'open' | 'resolved' | 'closed' */
    status: text("status").notNull().default("open"),
    /** For question rows only; points to the chosen `kind='answer'` row. */
    acceptedAnswerId: uuid("accepted_answer_id"),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    pinned: boolean("pinned").notNull().default(false),
    pinnedAt: timestamp("pinned_at", { withTimezone: true }),
    pinnedBy: text("pinned_by").references(() => users.id, {
      onDelete: "set null",
    }),
    locked: boolean("locked").notNull().default(false),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by").references(() => users.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    /** Populated by the `qa_threads_search_update` trigger. Do not write directly. */
    searchTsv: text("search_tsv"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("lesson_comments_lesson_status_idx").on(
      table.lessonId,
      table.status,
      table.createdAt
    ),
    index("lesson_comments_parent_idx").on(table.parentId, table.createdAt),
    index("lesson_comments_user_idx").on(table.userId, table.createdAt),
    index("lesson_comments_pinned_idx").on(
      table.lessonId,
      table.pinned,
      table.createdAt
    ),
    index("lesson_comments_deleted_at_idx").on(table.deletedAt),
  ]
);

export type LessonComment = typeof lessonComments.$inferSelect;
export type NewLessonComment = typeof lessonComments.$inferInsert;
