import "server-only";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  courses,
  examQuestions,
  exams,
  questionOptions,
  questions,
  type Course,
  type Exam,
  type ExamQuestion,
  type Question,
  type QuestionOption,
} from "@/db/schema";
import { isUuid } from "@/lib/utils";

/**
 * Shared ownership resolution and domain errors for the exam service.
 *
 * Ownership is never supplied by the client — every operation resolves the
 * chain option → question → exam_questions → exam → course → course.teacherId
 * in the database and returns null (never throws) when the chain does not
 * end at the authenticated teacher, so cross-teacher access behaves like
 * "not found" instead of leaking whether a resource exists.
 */

export class ExamNotFoundError extends Error {
  constructor() {
    super("Exam not found.");
  }
}

export class ExamNotEditableError extends Error {
  constructor() {
    super("Exams can only be edited while in draft status. Unpublish or restore the exam first.");
  }
}

export class ExamLifecycleError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ExamPublishBlockedError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ExamCannotDeleteError extends Error {
  constructor() {
    super("Published exams cannot be permanently deleted. Unpublish or archive the exam instead.");
  }
}

/** Exam → course → teacher. Returns null when the chain does not own it. */
export async function verifyExamOwnership(
  teacherId: string,
  examId: string
): Promise<{ exam: Exam; course: Course } | null> {
  if (!isUuid(examId)) return null;
  const db = getDb();
  const [row] = await db
    .select({ exam: exams, course: courses })
    .from(exams)
    .innerJoin(courses, eq(exams.courseId, courses.id))
    .where(and(eq(exams.id, examId), eq(courses.teacherId, teacherId)))
    .limit(1);
  return row ?? null;
}

/** Course → teacher. Returns null when the teacher does not own it. */
export async function verifyCourseOwnership(
  teacherId: string,
  courseId: string
): Promise<Course | null> {
  if (!isUuid(courseId)) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .limit(1);
  return row ?? null;
}

/**
 * Question → exam_questions → exam → course → teacher, scoped to a specific
 * exam. Phase 3A creates questions inside a single exam, so the exam scope
 * makes the resolution unambiguous even when a question later belongs to
 * several exams. Returns null when the chain does not match.
 */
export async function verifyQuestionInExam(
  teacherId: string,
  examId: string,
  questionId: string
): Promise<
  { question: Question; exam: Exam; course: Course; examQuestion: ExamQuestion } | null
> {
  if (!isUuid(examId) || !isUuid(questionId)) return null;
  const db = getDb();
  const [row] = await db
    .select({
      question: questions,
      examQuestion: examQuestions,
      exam: exams,
      course: courses,
    })
    .from(questions)
    .innerJoin(examQuestions, eq(examQuestions.questionId, questions.id))
    .innerJoin(exams, eq(examQuestions.examId, exams.id))
    .innerJoin(courses, eq(exams.courseId, courses.id))
    .where(
      and(
        eq(questions.id, questionId),
        eq(exams.id, examId),
        eq(courses.teacherId, teacherId)
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Question → exam_questions → exam → course → teacher, resolving through any
 * exam link that ends at the teacher (used by option mutations, which do not
 * carry an examId). Returns null when the chain does not match.
 */
export async function verifyQuestionForTeacher(
  teacherId: string,
  questionId: string
): Promise<{ question: Question; exam: Exam; course: Course } | null> {
  if (!isUuid(questionId)) return null;
  const db = getDb();
  const [row] = await db
    .select({ question: questions, exam: exams, course: courses })
    .from(questions)
    .innerJoin(examQuestions, eq(examQuestions.questionId, questions.id))
    .innerJoin(exams, eq(examQuestions.examId, exams.id))
    .innerJoin(courses, eq(exams.courseId, courses.id))
    .where(and(eq(questions.id, questionId), eq(courses.teacherId, teacherId)))
    .limit(1);
  return row ?? null;
}

/**
 * Option → question → exam_questions → exam → course → teacher. Returns null
 * when the chain does not match.
 */
export async function verifyOptionForTeacher(
  teacherId: string,
  optionId: string
): Promise<
  { option: QuestionOption; question: Question; exam: Exam; course: Course } | null
> {
  if (!isUuid(optionId)) return null;
  const db = getDb();
  const [row] = await db
    .select({
      option: questionOptions,
      question: questions,
      exam: exams,
      course: courses,
    })
    .from(questionOptions)
    .innerJoin(questions, eq(questionOptions.questionId, questions.id))
    .innerJoin(examQuestions, eq(examQuestions.questionId, questions.id))
    .innerJoin(exams, eq(examQuestions.examId, exams.id))
    .innerJoin(courses, eq(exams.courseId, courses.id))
    .where(
      and(eq(questionOptions.id, optionId), eq(courses.teacherId, teacherId))
    )
    .limit(1);
  return row ?? null;
}

/**
 * Guards structural mutation of an exam: only draft exams are editable.
 */
export function assertDraftExam(exam: Exam): void {
  if (exam.status !== "draft") {
    throw new ExamNotEditableError();
  }
}

/** Bumps an exam's updatedAt so UIs can tell the exam changed. */
export async function touchExam(examId: string): Promise<void> {
  const db = getDb();
  await db
    .update(exams)
    .set({ updatedAt: new Date() })
    .where(eq(exams.id, examId));
}