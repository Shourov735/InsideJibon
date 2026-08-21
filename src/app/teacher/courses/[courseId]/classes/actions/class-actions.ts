"use server";

import { revalidatePath } from "next/cache";

import { requireTeacher } from "@/lib/permissions";
import {
  createClassSessionSchema,
  updateClassSessionSchema,
  sessionActionByIdSchema,
} from "@/schemas/class-session";
import * as classService from "@/services/classes";
import type { ClassSession } from "@/db/schema";
import type { ActionResult } from "@/types/course";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";

function revalidateAfterClassChange(courseId?: string) {
  revalidatePath("/teacher/courses");
  if (courseId) {
    revalidatePath(`/teacher/courses/${courseId}`);
    revalidatePath(`/teacher/courses/${courseId}/classes`);
  }
  revalidatePath("/student");
}

export async function createClassSessionAction(
  formData: unknown
): Promise<ActionResult<ClassSession>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = createClassSessionSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const session = await classService.createClassSession(teacher.id, parsed.data);
    revalidateAfterClassChange(parsed.data.courseId);
    return { success: true, data: session };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to create class session.",
        t
      ),
    };
  }
}

export async function updateClassSessionAction(
  formData: unknown,
  courseId: string
): Promise<ActionResult<ClassSession>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = updateClassSessionSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const session = await classService.updateClassSession(
      teacher.id,
      parsed.data.sessionId,
      parsed.data
    );
    revalidateAfterClassChange(courseId);
    return { success: true, data: session };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to update class session.",
        t
      ),
    };
  }
}

export async function deleteClassSessionAction(
  formData: unknown,
  courseId: string
): Promise<ActionResult<{ deleted: boolean }>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = sessionActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid session identifier.", t) };
  }

  try {
    await classService.deleteClassSession(teacher.id, parsed.data.sessionId);
    revalidateAfterClassChange(courseId);
    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to delete class session.",
        t
      ),
    };
  }
}

export async function markSessionCompletedAction(
  formData: unknown,
  courseId: string
): Promise<ActionResult<ClassSession>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = sessionActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid session identifier.", t) };
  }

  try {
    const session = await classService.markSessionCompleted(
      teacher.id,
      parsed.data.sessionId
    );
    revalidateAfterClassChange(courseId);
    return { success: true, data: session };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to mark session as completed.",
        t
      ),
    };
  }
}

export async function cancelSessionAction(
  formData: unknown,
  courseId: string
): Promise<ActionResult<ClassSession>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = sessionActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid session identifier.", t) };
  }

  try {
    const session = await classService.cancelSession(
      teacher.id,
      parsed.data.sessionId
    );
    revalidateAfterClassChange(courseId);
    return { success: true, data: session };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to cancel class session.",
        t
      ),
    };
  }
}
