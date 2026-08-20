"use server";

import { revalidatePath } from "next/cache";

import { requireTeacher } from "@/lib/permissions";
import {
  createLessonSchema,
  deleteLessonSchema,
  reorderLessonsSchema,
  updateLessonSchema,
} from "@/schemas/course";
import * as courseService from "@/services/courses";
import type { ActionResult, Lesson } from "@/types/course";

/**
 * Creates a new lesson inside a module.
 */
export async function createLessonAction(
  formData: unknown,
  courseId?: string
): Promise<ActionResult<Lesson>> {
  const teacher = await requireTeacher();
  const parsed = createLessonSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed for lesson data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const lesson = await courseService.createLesson(teacher.id, parsed.data);
    if (courseId) {
      revalidatePath(`/teacher/courses/${courseId}/builder`);
    }
    return { success: true, data: lesson };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create lesson",
    };
  }
}

/**
 * Updates a lesson.
 */
export async function updateLessonAction(
  formData: unknown,
  courseId?: string
): Promise<ActionResult<Lesson>> {
  const teacher = await requireTeacher();
  const parsed = updateLessonSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed for lesson data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const lesson = await courseService.updateLesson(
      teacher.id,
      parsed.data.lessonId,
      parsed.data
    );
    if (courseId) {
      revalidatePath(`/teacher/courses/${courseId}/builder`);
    }
    return { success: true, data: lesson };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update lesson",
    };
  }
}

/**
 * Deletes a lesson.
 */
export async function deleteLessonAction(
  formData: unknown,
  courseId?: string
): Promise<ActionResult<{ deleted: boolean }>> {
  const teacher = await requireTeacher();
  const parsed = deleteLessonSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid lesson identifier",
    };
  }

  try {
    await courseService.deleteLesson(teacher.id, parsed.data.lessonId);
    if (courseId) {
      revalidatePath(`/teacher/courses/${courseId}/builder`);
    }
    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete lesson",
    };
  }
}

/**
 * Reorders lessons within a module.
 */
export async function reorderLessonsAction(
  formData: unknown,
  courseId?: string
): Promise<ActionResult<{ reordered: boolean }>> {
  const teacher = await requireTeacher();
  const parsed = reorderLessonsSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid reorder parameters",
    };
  }

  try {
    await courseService.reorderLessons(
      teacher.id,
      parsed.data.moduleId,
      parsed.data.orderedLessonIds
    );
    if (courseId) {
      revalidatePath(`/teacher/courses/${courseId}/builder`);
    }
    return { success: true, data: { reordered: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reorder lessons",
    };
  }
}
