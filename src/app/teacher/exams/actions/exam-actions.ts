"use server";

import { revalidatePath } from "next/cache";

import { requireTeacher } from "@/lib/permissions";
import {
  createExamSchema,
  examActionByIdSchema,
  updateExamSchema,
} from "@/schemas/exam";
import * as examService from "@/services/exams";
import type { ActionResult } from "@/types/course";
import type { Exam } from "@/types/exam";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";

const EXAM_PATHS = (examId: string) => [
  "/teacher/exams",
  `/teacher/exams/${examId}`,
  `/teacher/exams/${examId}/edit`,
  `/teacher/exams/${examId}/builder`,
];

/**
 * Creates a new draft exam under the authenticated teacher's course.
 */
export async function createExamAction(
  formData: unknown
): Promise<ActionResult<Exam>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = createExamSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const exam = await examService.createExam(teacher.id, parsed.data);
    revalidatePath("/teacher/exams");
    revalidatePath(`/teacher/courses/${parsed.data.courseId}`);
    return { success: true, data: exam };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to create exam.", t),
    };
  }
}

/**
 * Updates exam metadata (title, description, duration).
 */
export async function updateExamAction(
  formData: unknown
): Promise<ActionResult<Exam>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = updateExamSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const exam = await examService.updateExam(
      teacher.id,
      parsed.data.examId,
      parsed.data
    );
    EXAM_PATHS(parsed.data.examId).forEach((p) => revalidatePath(p));
    return { success: true, data: exam };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to update exam.", t),
    };
  }
}

/**
 * Publishes an exam after full structural validation.
 */
export async function publishExamAction(
  formData: unknown
): Promise<ActionResult<Exam>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = examActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid exam identifier.", t) };
  }

  try {
    const exam = await examService.publishExam(teacher.id, parsed.data.examId, t);
    EXAM_PATHS(parsed.data.examId).forEach((p) => revalidatePath(p));
    return { success: true, data: exam };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to publish exam.", t),
    };
  }
}

/**
 * Unpublishes a published exam back to draft.
 */
export async function unpublishExamAction(
  formData: unknown
): Promise<ActionResult<Exam>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = examActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid exam identifier.", t) };
  }

  try {
    const exam = await examService.unpublishExam(teacher.id, parsed.data.examId);
    EXAM_PATHS(parsed.data.examId).forEach((p) => revalidatePath(p));
    return { success: true, data: exam };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to unpublish exam.", t),
    };
  }
}

/**
 * Archives an active exam.
 */
export async function archiveExamAction(
  formData: unknown
): Promise<ActionResult<Exam>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = examActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid exam identifier.", t) };
  }

  try {
    const exam = await examService.archiveExam(teacher.id, parsed.data.examId);
    EXAM_PATHS(parsed.data.examId).forEach((p) => revalidatePath(p));
    return { success: true, data: exam };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to archive exam.", t),
    };
  }
}

/**
 * Restores an archived exam to draft.
 */
export async function restoreExamAction(
  formData: unknown
): Promise<ActionResult<Exam>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = examActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid exam identifier.", t) };
  }

  try {
    const exam = await examService.restoreExam(teacher.id, parsed.data.examId);
    EXAM_PATHS(parsed.data.examId).forEach((p) => revalidatePath(p));
    return { success: true, data: exam };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to restore exam.", t),
    };
  }
}

/**
 * Permanently deletes a draft or archived exam.
 */
export async function deleteExamAction(
  formData: unknown
): Promise<ActionResult<{ deleted: boolean }>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = examActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid exam identifier.", t) };
  }

  try {
    await examService.deleteExam(teacher.id, parsed.data.examId);
    revalidatePath("/teacher/exams");
    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to delete exam.", t),
    };
  }
}