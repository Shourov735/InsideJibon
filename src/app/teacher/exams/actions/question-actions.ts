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

/**
 * Creates a question inside a draft exam owned by the teacher.
 */
export async function createQuestionAction(
  formData: unknown
): Promise<ActionResult<ExamQuestionWithDetails>> {
  const teacher = await requireTeacher();
  const parsed = createQuestionSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed for question data.",
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
      error: error instanceof Error ? error.message : "Failed to create question.",
    };
  }
}

/**
 * Updates a question's text, explanation and marks.
 */
export async function updateQuestionAction(
  formData: unknown
): Promise<ActionResult<ExamQuestionWithDetails>> {
  const teacher = await requireTeacher();
  const parsed = updateQuestionSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed for question data.",
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
      error: error instanceof Error ? error.message : "Failed to update question.",
    };
  }
}

/**
 * Deletes a question from a draft exam owned by the teacher.
 */
export async function deleteQuestionAction(
  formData: unknown
): Promise<ActionResult<{ deleted: boolean }>> {
  const teacher = await requireTeacher();
  const parsed = questionActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: "Invalid question identifier." };
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
      error: error instanceof Error ? error.message : "Failed to delete question.",
    };
  }
}

/**
 * Reorders the questions of a draft exam.
 */
export async function reorderQuestionsAction(
  formData: unknown
): Promise<ActionResult<{ reordered: boolean }>> {
  const teacher = await requireTeacher();
  const parsed = reorderQuestionsSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: "Invalid reorder parameters." };
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
      error: error instanceof Error ? error.message : "Failed to reorder questions.",
    };
  }
}