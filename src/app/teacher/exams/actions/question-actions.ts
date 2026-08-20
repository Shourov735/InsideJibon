"use server";

import { revalidatePath } from "next/cache";

import { requireTeacher } from "@/lib/permissions";
import {
  createQuestionSchema,
  questionActionByIdSchema,
  reorderQuestionsSchema,
  updateQuestionSchema,
} from "@/schemas/exam";
import * as examService from "@/services/exams";
import type { ActionResult } from "@/types/course";
import type { ExamQuestionWithDetails } from "@/types/exam";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";

/**
 * Creates a question inside a draft exam owned by the teacher.
 */
export async function createQuestionAction(
  formData: unknown
): Promise<ActionResult<ExamQuestionWithDetails>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = createQuestionSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed for question data.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const question = await examService.createQuestion(teacher.id, parsed.data);
    revalidatePath(`/teacher/exams/${parsed.data.examId}/builder`);
    revalidatePath(`/teacher/exams/${parsed.data.examId}`);
    revalidatePath("/teacher/exams");
    return { success: true, data: question };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to create question.", t),
    };
  }
}

/**
 * Updates a question's text, explanation and marks.
 */
export async function updateQuestionAction(
  formData: unknown
): Promise<ActionResult<ExamQuestionWithDetails>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = updateQuestionSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed for question data.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const question = await examService.updateQuestion(teacher.id, parsed.data);
    revalidatePath(`/teacher/exams/${parsed.data.examId}/builder`);
    revalidatePath(`/teacher/exams/${parsed.data.examId}`);
    return { success: true, data: question };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to update question.", t),
    };
  }
}

/**
 * Deletes a question from a draft exam owned by the teacher.
 */
export async function deleteQuestionAction(
  formData: unknown
): Promise<ActionResult<{ deleted: boolean }>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = questionActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid question identifier.", t) };
  }

  try {
    await examService.deleteQuestion(
      teacher.id,
      parsed.data.examId,
      parsed.data.questionId
    );
    revalidatePath(`/teacher/exams/${parsed.data.examId}/builder`);
    revalidatePath(`/teacher/exams/${parsed.data.examId}`);
    revalidatePath("/teacher/exams");
    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to delete question.", t),
    };
  }
}

/**
 * Reorders the questions of a draft exam.
 */
export async function reorderQuestionsAction(
  formData: unknown
): Promise<ActionResult<{ reordered: boolean }>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = reorderQuestionsSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid reorder parameters.", t) };
  }

  try {
    await examService.reorderQuestions(
      teacher.id,
      parsed.data.examId,
      parsed.data.orderedQuestionIds
    );
    revalidatePath(`/teacher/exams/${parsed.data.examId}/builder`);
    revalidatePath(`/teacher/exams/${parsed.data.examId}`);
    return { success: true, data: { reordered: true } };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to reorder questions.", t),
    };
  }
}