"use server";

import { revalidatePath } from "next/cache";

import { requireTeacher } from "@/lib/permissions";
import {
  createModuleSchema,
  deleteModuleSchema,
  reorderModulesSchema,
  updateModuleSchema,
} from "@/schemas/course";
import * as courseService from "@/services/courses";
import type { ActionResult, CourseModule } from "@/types/course";

/**
 * Creates a new module inside a course.
 */
export async function createModuleAction(
  formData: unknown
): Promise<ActionResult<CourseModule>> {
  const teacher = await requireTeacher();
  const parsed = createModuleSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed for module data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const moduleRow = await courseService.createModule(teacher.id, parsed.data);
    revalidatePath(`/teacher/courses/${parsed.data.courseId}/builder`);
    revalidatePath(`/teacher/courses/${parsed.data.courseId}`);
    return { success: true, data: moduleRow };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create module",
    };
  }
}

/**
 * Updates a module's title and description.
 */
export async function updateModuleAction(
  formData: unknown,
  courseId?: string
): Promise<ActionResult<CourseModule>> {
  const teacher = await requireTeacher();
  const parsed = updateModuleSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed for module data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const moduleRow = await courseService.updateModule(
      teacher.id,
      parsed.data.moduleId,
      parsed.data
    );
    if (courseId) {
      revalidatePath(`/teacher/courses/${courseId}/builder`);
      revalidatePath(`/teacher/courses/${courseId}`);
    }
    return { success: true, data: moduleRow };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update module",
    };
  }
}

/**
 * Deletes a module.
 */
export async function deleteModuleAction(
  formData: unknown,
  courseId?: string
): Promise<ActionResult<{ deleted: boolean }>> {
  const teacher = await requireTeacher();
  const parsed = deleteModuleSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid module identifier",
    };
  }

  try {
    await courseService.deleteModule(teacher.id, parsed.data.moduleId);
    if (courseId) {
      revalidatePath(`/teacher/courses/${courseId}/builder`);
      revalidatePath(`/teacher/courses/${courseId}`);
    }
    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete module",
    };
  }
}

/**
 * Reorders modules within a course.
 */
export async function reorderModulesAction(
  formData: unknown
): Promise<ActionResult<{ reordered: boolean }>> {
  const teacher = await requireTeacher();
  const parsed = reorderModulesSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid reorder parameters",
    };
  }

  try {
    await courseService.reorderModules(
      teacher.id,
      parsed.data.courseId,
      parsed.data.orderedModuleIds
    );
    revalidatePath(`/teacher/courses/${parsed.data.courseId}/builder`);
    return { success: true, data: { reordered: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reorder modules",
    };
  }
}
