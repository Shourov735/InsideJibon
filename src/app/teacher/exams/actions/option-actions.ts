"use server";

import { revalidatePath } from "next/cache";

import { requireTeacher } from "@/lib/permissions";
import {
  createOptionSchema,
  optionActionByIdSchema,
  updateOptionSchema,
} from "@/schemas/exam";
import * as examService from "@/services/exams";
import type { ActionResult } from "@/types/course";
import type { QuestionOption } from "@/types/exam";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";

/**
 * Creates an answer option on a question inside a draft exam owned by the
 * teacher. `examId` is passed by the UI purely for path revalidation.
 */
export async function createOptionAction(
  formData: unknown,
  examId?: string
): Promise<ActionResult<QuestionOption>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = createOptionSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed for option data.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const option = await examService.createOption(teacher.id, parsed.data);
    if (examId) {
      revalidatePath(`/teacher/exams/${examId}/builder`);
      revalidatePath(`/teacher/exams/${examId}`);
    }
    return { success: true, data: option };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to create option.", t),
    };
  }
}

/**
 * Updates an option's text and/or correctness.
 */
export async function updateOptionAction(
  formData: unknown,
  examId?: string
): Promise<ActionResult<QuestionOption>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = updateOptionSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed for option data.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const option = await examService.updateOption(teacher.id, parsed.data);
    if (examId) {
      revalidatePath(`/teacher/exams/${examId}/builder`);
      revalidatePath(`/teacher/exams/${examId}`);
    }
    return { success: true, data: option };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to update option.", t),
    };
  }
}

/**
 * Deletes an answer option from a question inside a draft exam.
 */
export async function deleteOptionAction(
  formData: unknown,
  examId?: string
): Promise<ActionResult<{ deleted: boolean }>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = optionActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid option identifier.", t) };
  }

  try {
    await examService.deleteOption(teacher.id, parsed.data.optionId);
    if (examId) {
      revalidatePath(`/teacher/exams/${examId}/builder`);
      revalidatePath(`/teacher/exams/${examId}`);
    }
    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to delete option.", t),
    };
  }
}