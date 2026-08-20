import "server-only";
import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { examQuestions, questions, type Question } from "@/db/schema";
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
} from "@/schemas/exam";
import type { ExamQuestionWithDetails } from "@/types/exam";
import {
  ExamNotFoundError,
  assertDraftExam,
  touchExam,
  verifyExamOwnership,
  verifyQuestionInExam,
} from "./ownership";

/**
 * Teacher question management. Questions are created fresh inside one exam
 * (the question bank reuse is a later phase), but they are stored as
 * reusable rows referenced through exam_questions, which carries the per-exam
 * position and marks.
 */

/**
 * Creates a question at the end of the exam's question sequence. The marks
 * default to 1 and live on the exam_questions link.
 */
export async function createQuestion(
  teacherId: string,
  input: CreateQuestionInput
): Promise<ExamQuestionWithDetails> {
  const resolved = await verifyExamOwnership(teacherId, input.examId);
  if (!resolved) throw new ExamNotFoundError();
  assertDraftExam(resolved.exam);

  const db = getDb();
  const [maxPos] = await db
    .select({ max: sql<number>`COALESCE(MAX(${examQuestions.position}), 0)::int` })
    .from(examQuestions)
    .where(eq(examQuestions.examId, input.examId));

  const nextPosition = (maxPos?.max ?? 0) + 1;
  const marks = input.marks == null ? 1 : Number(input.marks);

  const [question] = await db
    .insert(questions)
    .values({
      questionText: input.questionText.trim(),
      explanation: input.explanation?.trim() || null,
    })
    .returning();

  await db.insert(examQuestions).values({
    examId: input.examId,
    questionId: question.id,
    position: nextPosition,
    marks,
  });

  await touchExam(input.examId);

  return { ...question, position: nextPosition, marks, options: [] };
}

/**
 * Updates a question's text, explanation and its per-exam marks.
 */
export async function updateQuestion(
  teacherId: string,
  input: UpdateQuestionInput
): Promise<ExamQuestionWithDetails> {
  const resolved = await verifyQuestionInExam(
    teacherId,
    input.examId,
    input.questionId
  );
  if (!resolved) throw new ExamNotFoundError();
  assertDraftExam(resolved.exam);

  const db = getDb();
  const [question] = await db
    .update(questions)
    .set({
      questionText: input.questionText.trim(),
      explanation: input.explanation?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(questions.id, input.questionId))
    .returning();

  const [link] = await db
    .update(examQuestions)
    .set({ marks: Number(input.marks), updatedAt: new Date() })
    .where(
      and(
        eq(examQuestions.examId, input.examId),
        eq(examQuestions.questionId, input.questionId)
      )
    )
    .returning();

  await touchExam(input.examId);

  return {
    ...question,
    position: link.position,
    marks: link.marks,
    options: [],
  };
}

/**
 * Deletes a question (its options and exam_questions links cascade) and
 * re-compacts the exam's remaining question positions.
 */
export async function deleteQuestion(
  teacherId: string,
  examId: string,
  questionId: string
): Promise<void> {
  const resolved = await verifyQuestionInExam(teacherId, examId, questionId);
  if (!resolved) throw new ExamNotFoundError();
  assertDraftExam(resolved.exam);

  const db = getDb();
  await db.delete(questions).where(eq(questions.id, questionId));

  // Re-compact remaining questions for this exam to 1..N
  const remaining = await db
    .select({ id: examQuestions.questionId })
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId))
    .orderBy(examQuestions.position);

  for (let i = 0; i < remaining.length; i++) {
    await db
      .update(examQuestions)
      .set({ position: i + 1, updatedAt: new Date() })
      .where(
        and(
          eq(examQuestions.examId, examId),
          eq(examQuestions.questionId, remaining[i].id)
        )
      );
  }

  await touchExam(examId);
}

/**
 * Reorders the exam's questions based on an ordered array of question IDs.
 * Every provided ID must belong to the exam (IDs from other exams are
 * rejected with a generic error).
 */
export async function reorderQuestions(
  teacherId: string,
  examId: string,
  orderedQuestionIds: string[]
): Promise<void> {
  const resolved = await verifyExamOwnership(teacherId, examId);
  if (!resolved) throw new ExamNotFoundError();
  assertDraftExam(resolved.exam);

  const db = getDb();
  const existing = await db
    .select({ id: examQuestions.questionId })
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId));

  const existingIds = new Set(existing.map((row) => row.id));
  for (const id of orderedQuestionIds) {
    if (!existingIds.has(id)) {
      throw new ExamNotFoundError();
    }
  }

  for (let i = 0; i < orderedQuestionIds.length; i++) {
    await db
      .update(examQuestions)
      .set({ position: i + 1, updatedAt: new Date() })
      .where(
        and(
          eq(examQuestions.examId, examId),
          eq(examQuestions.questionId, orderedQuestionIds[i])
        )
      );
  }

  await touchExam(examId);
}

export type { Question };