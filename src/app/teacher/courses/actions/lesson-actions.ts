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
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";

/**
 * Creates a new lesson inside a module.
 */
export async function createLessonAction(
  formData: unknown,
  courseId?: string
): Promise<ActionResult<Lesson>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = createLessonSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed for lesson data.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const lesson = await courseService.createLesson(teacher.id, parsed.data);
    if (courseId) {
      revalidatePath(`/teacher/courses/${courseId}/builder`);
    }
    // R8 §3.4 — reindex lesson captions / text best-effort after create.
    // Inline execution (see ai/pipeline.ts architecture note). The
    // promise is intentionally not awaited: the lesson action returns
    // immediately, and the indexing runs in the request's tail.
    void (async () => {
      try {
        const { enqueueLessonReindex } = await import("@/services/ai/pipeline");
        await enqueueLessonReindex({
          lessonId: lesson.id,
          videoUrl: lesson.videoUrl,
        });
      } catch {
        // Best-effort — tutor UI surfaces "indexing..." state on read.
      }
    })();
    return { success: true, data: lesson };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to create lesson", t),
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
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = updateLessonSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed for lesson data.", t),
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
    // R8 §3.4 — reindex on update.
    void (async () => {
      try {
        const { enqueueLessonReindex } = await import("@/services/ai/pipeline");
        await enqueueLessonReindex({
          lessonId: lesson.id,
          videoUrl: lesson.videoUrl,
        });
      } catch {
        // Best-effort.
      }
    })();
    return { success: true, data: lesson };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to update lesson", t),
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
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = deleteLessonSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Invalid lesson identifier", t),
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
      error: localizeMessage(error instanceof Error ? error.message : "Failed to delete lesson", t),
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
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = reorderLessonsSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Invalid reorder parameters", t),
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
      error: localizeMessage(error instanceof Error ? error.message : "Failed to reorder lessons", t),
    };
  }
}
