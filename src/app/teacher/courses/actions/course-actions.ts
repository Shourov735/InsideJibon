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

/**
 * Creates a new course under the authenticated teacher's account.
 */
export async function createCourseAction(
  formData: unknown
): Promise<ActionResult<Course>> {
  const teacher = await requireTeacher();
  const parsed = createCourseSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed. Please check the form errors.",
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
      error: error instanceof Error ? error.message : "Failed to create course",
    };
  }
}

/**
 * Updates basic course details.
 */
export async function updateCourseAction(
  formData: unknown
): Promise<ActionResult<Course>> {
  const teacher = await requireTeacher();
  const parsed = updateCourseSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed. Please check the form errors.",
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
      error: error instanceof Error ? error.message : "Failed to update course",
    };
  }
}

/**
 * Deletes a draft or archived course.
 */
export async function deleteCourseAction(
  formData: unknown
): Promise<ActionResult<{ deleted: boolean }>> {
  const teacher = await requireTeacher();
  const parsed = deleteCourseSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid course identifier",
    };
  }

  try {
    await courseService.deleteCourse(teacher.id, parsed.data.courseId);
    revalidatePath("/teacher/courses");
    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete course",
    };
  }
}

/**
 * Archives an active course.
 */
export async function archiveCourseAction(
  formData: unknown
): Promise<ActionResult<Course>> {
  const teacher = await requireTeacher();
  const parsed = courseActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid course identifier",
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
      error: error instanceof Error ? error.message : "Failed to archive course",
    };
  }
}

/**
 * Restores an archived course to draft.
 */
export async function restoreCourseAction(
  formData: unknown
): Promise<ActionResult<Course>> {
  const teacher = await requireTeacher();
  const parsed = courseActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid course identifier",
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
      error: error instanceof Error ? error.message : "Failed to restore course",
    };
  }
}

/**
 * Publishes a course after full prerequisite validation.
 */
export async function publishCourseAction(
  formData: unknown
): Promise<ActionResult<Course>> {
  const teacher = await requireTeacher();
  const parsed = courseActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid course identifier",
    };
  }

  try {
    const course = await courseService.publishCourse(teacher.id, parsed.data.courseId);
    revalidatePath("/teacher/courses");
    revalidatePath(`/teacher/courses/${parsed.data.courseId}`);
    revalidatePath(`/teacher/courses/${parsed.data.courseId}/builder`);
    return { success: true, data: course };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish course",
    };
  }
}

/**
 * Unpublishes a published course, setting its status back to draft.
 */
export async function unpublishCourseAction(
  formData: unknown
): Promise<ActionResult<Course>> {
  const teacher = await requireTeacher();
  const parsed = courseActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid course identifier",
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
      error: error instanceof Error ? error.message : "Failed to unpublish course",
    };
  }
}
