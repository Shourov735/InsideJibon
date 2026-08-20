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

import { courses } from "./index";

export const examStatusEnum = pgEnum("exam_status", [
  "draft",
  "published",
  "archived",
]);

export const questionTypeEnum = pgEnum("question_type", ["multiple_choice"]);

/**
 * A teacher-authored examination attached to one of their courses.
 *
 * Ownership is NOT duplicated here: it is derived through
 * exam → course → course.teacherId. The exam lifecycle mirrors the course
 * lifecycle (draft → published → archived). Published exams are structurally
 * frozen: question/option mutations are rejected by the service layer until
 * the exam is unpublished again.
 *
 * totalMarks is intentionally NOT stored — it is the sum of the marks on the
 * exam's exam_questions rows and is derived when needed. durationMinutes is a
 * nullable basic setting (unused until the student attempt phase).
 */
export const exams = pgTable(
  "exams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes"),
    status: examStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("exams_course_id_idx").on(table.courseId),
    index("exams_course_status_idx").on(table.courseId, table.status),
  ]
);

/**
 * Reusable question bank row. Questions deliberately have NO examId — an exam
 * references questions through exam_questions (which carries per-exam
 * position and marks). Phase 3A creates questions only inside a single exam,
 * but the model already supports a question being linked to multiple exams.
 */
export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionType: questionTypeEnum("question_type")
      .notNull()
      .default("multiple_choice"),
    questionText: text("question_text").notNull(),
    explanation: text("explanation"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("questions_type_idx").on(table.questionType),
  ]
);

/**
 * Answer options of a question. isCorrect is a plain boolean per option; the
 * "exactly one correct option" invariant for multiple-choice questions is
 * enforced by the service layer on write (marking one option correct
 * unmarks its siblings) and again by publish validation.
 */
export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    optionText: text("option_text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    position: integer("position").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("question_options_question_id_idx").on(table.questionId),
    index("question_options_question_position_idx").on(
      table.questionId,
      table.position
    ),
  ]
);

/**
 * The exam ↔ question relationship: which questions belong to an exam, in
 * what order (position) and for how many marks. marks lives here (per exam)
 * rather than on questions so the same question can later earn different
 * marks in different exams. A question may appear in an exam at most once.
 */
export const examQuestions = pgTable(
  "exam_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(1),
    marks: integer("marks").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("exam_questions_exam_question_unique").on(
      table.examId,
      table.questionId
    ),
    index("exam_questions_exam_position_idx").on(table.examId, table.position),
    index("exam_questions_question_id_idx").on(table.questionId),
  ]
);

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type ExamStatus = Exam["status"];

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type QuestionType = Question["questionType"];

export type QuestionOption = typeof questionOptions.$inferSelect;
export type NewQuestionOption = typeof questionOptions.$inferInsert;

export type ExamQuestion = typeof examQuestions.$inferSelect;
export type NewExamQuestion = typeof examQuestions.$inferInsert;