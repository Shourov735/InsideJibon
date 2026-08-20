import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { questionOptions, type QuestionOption } from "@/db/schema";
import type {
  CreateOptionInput,
  UpdateOptionInput,
} from "@/schemas/exam";
import {
  ExamNotFoundError,
  assertDraftExam,
  touchExam,
  verifyOptionForTeacher,
  verifyQuestionForTeacher,
} from "./ownership";

/**
 * Teacher answer-option management for multiple-choice questions. Options
 * are stored on the reusable question row; correctness is enforced at the
 * service layer: marking one option correct unmarks its siblings, and
 * publish validation re-checks the exactly-one invariant.
 */

/**
 * Creates an option at the end of the question's option sequence.
 */
export async function createOption(
  teacherId: string,
  input: CreateOptionInput
): Promise<QuestionOption> {
  const resolved = await verifyQuestionForTeacher(teacherId, input.questionId);
  if (!resolved) throw new ExamNotFoundError();
  assertDraftExam(resolved.exam);

  const db = getDb();
  const [maxPos] = await db
    .select({ max: sql<number>`COALESCE(MAX(${questionOptions.position}), 0)::int` })
    .from(questionOptions)
    .where(eq(questionOptions.questionId, input.questionId));

  const nextPosition = (maxPos?.max ?? 0) + 1;

  const [option] = await db
    .insert(questionOptions)
    .values({
      questionId: input.questionId,
      optionText: input.optionText.trim(),
      isCorrect: input.isCorrect ?? false,
      position: nextPosition,
    })
    .returning();

  // Marking the new option correct replaces any previously correct sibling.
  if (option.isCorrect) {
    await db
      .update(questionOptions)
      .set({ isCorrect: false, updatedAt: new Date() })
      .where(
        and(
          eq(questionOptions.questionId, input.questionId),
          ne(questionOptions.id, option.id),
          eq(questionOptions.isCorrect, true)
        )
      );
  }

  await touchExam(resolved.exam.id);

  return option;
}

/**
 * Updates an option's text and correctness. Setting isCorrect = true replaces
 * any previously correct sibling of the same question (radio behavior); the
 * "exactly one correct" invariant is also enforced by publish validation.
 */
export async function updateOption(
  teacherId: string,
  input: UpdateOptionInput
): Promise<QuestionOption> {
  const resolved = await verifyOptionForTeacher(teacherId, input.optionId);
  if (!resolved) throw new ExamNotFoundError();
  assertDraftExam(resolved.exam);

  const db = getDb();

  if (input.isCorrect) {
    await db
      .update(questionOptions)
      .set({ isCorrect: false, updatedAt: new Date() })
      .where(
        and(
          eq(questionOptions.questionId, resolved.question.id),
          ne(questionOptions.id, input.optionId),
          eq(questionOptions.isCorrect, true)
        )
      );
  }

  const [updated] = await db
    .update(questionOptions)
    .set({
      optionText: input.optionText.trim(),
      isCorrect: input.isCorrect,
      updatedAt: new Date(),
    })
    .where(eq(questionOptions.id, input.optionId))
    .returning();

  await touchExam(resolved.exam.id);

  return updated;
}

/**
 * Deletes an option and re-compacts the question's remaining option
 * positions. Removing the last correct option is allowed while drafting;
 * publish validation then reports the missing correct answer.
 */
export async function deleteOption(
  teacherId: string,
  optionId: string
): Promise<void> {
  const resolved = await verifyOptionForTeacher(teacherId, optionId);
  if (!resolved) throw new ExamNotFoundError();
  assertDraftExam(resolved.exam);

  const db = getDb();
  await db.delete(questionOptions).where(eq(questionOptions.id, optionId));

  // Re-compact remaining options for this question to 1..N
  const remaining = await db
    .select({ id: questionOptions.id })
    .from(questionOptions)
    .where(eq(questionOptions.questionId, resolved.question.id))
    .orderBy(questionOptions.position);

  for (let i = 0; i < remaining.length; i++) {
    await db
      .update(questionOptions)
      .set({ position: i + 1, updatedAt: new Date() })
      .where(eq(questionOptions.id, remaining[i].id));
  }

  await touchExam(resolved.exam.id);
}