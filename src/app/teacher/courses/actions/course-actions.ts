"use server";

import { revalidatePath } from "next/cache";

import { requireTeacher } from "@/lib/permissions";
import {
  courseActionByIdSchema,
  createCourseSchema,
  deleteCourseSchema,
  updateCourseSchema,
} from "@/schemas/course";
import * as courseService from "@/services/courses";
import type { ActionResult, Course } from "@/types/course";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";

/**
 * Creates a new course under the authenticated teacher's account.
 */
export async function createCourseAction(
  formData: unknown
): Promise<ActionResult<Course>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = createCourseSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const course = await courseService.createCourse(teacher.id, parsed.data);
    revalidatePath("/teacher/courses");
    return { success: true, data: course };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to create course", t),
    };
  }
}

/**
 * Updates basic course details.
 */
export async function updateCourseAction(
  formData: unknown
): Promise<ActionResult<Course>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = updateCourseSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const course = await courseService.updateCourse(
      teacher.id,
      parsed.data.courseId,
      parsed.data
    );
    revalidatePath("/teacher/courses");
    revalidatePath(`/teacher/courses/${parsed.data.courseId}`);
    revalidatePath(`/teacher/courses/${parsed.data.courseId}/edit`);
    revalidatePath(`/teacher/courses/${parsed.data.courseId}/builder`);
    return { success: true, data: course };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to update course", t),
    };
  }
}

/**
 * Deletes a draft or archived course.
 */
export async function deleteCourseAction(
  formData: unknown
): Promise<ActionResult<{ deleted: boolean }>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = deleteCourseSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Invalid course identifier", t),
    };
  }

  try {
    await courseService.deleteCourse(teacher.id, parsed.data.courseId);
    revalidatePath("/teacher/courses");
    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to delete course", t),
    };
  }
}

/**
 * Archives an active course.
 */
export async function archiveCourseAction(
  formData: unknown
): Promise<ActionResult<Course>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = courseActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Invalid course identifier", t),
    };
  }

  try {
    const course = await courseService.archiveCourse(teacher.id, parsed.data.courseId);
    revalidatePath("/teacher/courses");
    revalidatePath(`/teacher/courses/${parsed.data.courseId}`);
    revalidatePath(`/teacher/courses/${parsed.data.courseId}/builder`);
    return { success: true, data: course };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to archive course", t),
    };
  }
}

/**
 * Restores an archived course to draft.
 */
export async function restoreCourseAction(
  formData: unknown
): Promise<ActionResult<Course>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = courseActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Invalid course identifier", t),
    };
  }

  try {
    const course = await courseService.restoreCourse(teacher.id, parsed.data.courseId);
    revalidatePath("/teacher/courses");
    revalidatePath(`/teacher/courses/${parsed.data.courseId}`);
    revalidatePath(`/teacher/courses/${parsed.data.courseId}/builder`);
    return { success: true, data: course };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to restore course", t),
    };
  }
}

/**
 * Publishes a course after full prerequisite validation.
 */
export async function publishCourseAction(
  formData: unknown
): Promise<ActionResult<Course>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = courseActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Invalid course identifier", t),
    };
  }

  try {
    const course = await courseService.publishCourse(teacher.id, parsed.data.courseId, t);
    revalidatePath("/teacher/courses");
    revalidatePath(`/teacher/courses/${parsed.data.courseId}`);
    revalidatePath(`/teacher/courses/${parsed.data.courseId}/builder`);
    return { success: true, data: course };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to publish course", t),
    };
  }
}

/**
 * Unpublishes a published course, setting its status back to draft.
 */
export async function unpublishCourseAction(
  formData: unknown
): Promise<ActionResult<Course>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = courseActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Invalid course identifier", t),
    };
  }

  try {
    const course = await courseService.unpublishCourse(teacher.id, parsed.data.courseId);
    revalidatePath("/teacher/courses");
    revalidatePath(`/teacher/courses/${parsed.data.courseId}`);
    revalidatePath(`/teacher/courses/${parsed.data.courseId}/builder`);
    return { success: true, data: course };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(error instanceof Error ? error.message : "Failed to unpublish course", t),
    };
  }
}
