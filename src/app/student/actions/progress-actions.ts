"use server";

import { revalidatePath } from "next/cache";

import { requireStudent } from "@/lib/permissions";
import {
  lessonPositionActionSchema,
  lessonProgressActionSchema,
} from "@/schemas/learning";
import * as learningService from "@/services/learning";
import type { ActionResult } from "@/types/course";

/**
 * Marks a lesson completed or un-completed for the authenticated student.
 * The lesson's course is derived from the database; the student must be
 * enrolled in its published course or this fails with a sanitized error.
 */
export async function markLessonCompleteAction(
  formData: unknown
): Promise<ActionResult<{ completed: boolean }>> {
  const student = await requireStudent();
  const parsed = lessonProgressActionSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: "Invalid lesson identifier." };
  }

  try {
    const { courseId } = parsed.data.completed
      ? await learningService.markLessonCompleted(
          student.id,
          parsed.data.lessonId
        )
      : await learningService.unmarkLessonCompleted(
          student.id,
          parsed.data.lessonId
        );

    revalidatePath(`/student/courses/${courseId}/learn`);
    revalidatePath("/student");
    revalidatePath("/student/courses");
    return { success: true, data: { completed: parsed.data.completed } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update lesson progress.",
    };
  }
}

/**
 * Records the student's position inside a lesson (e.g. video seconds) so
 * learning can resume exactly where they left off.
 */
export async function updateLessonPositionAction(
  formData: unknown
): Promise<ActionResult<{ position: number }>> {
  const student = await requireStudent();
  const parsed = lessonPositionActionSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: "Invalid lesson data." };
  }

  try {
    await learningService.updateLessonPosition(
      student.id,
      parsed.data.lessonId,
      parsed.data.position
    );
    return { success: true, data: { position: parsed.data.position } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save lesson position.",
    };
  }
}