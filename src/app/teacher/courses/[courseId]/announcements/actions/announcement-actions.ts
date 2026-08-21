"use server";

import { revalidatePath } from "next/cache";

import { requireTeacher } from "@/lib/permissions";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  announcementActionByIdSchema,
} from "@/schemas/announcement";
import * as announcementService from "@/services/announcements";
import type { Announcement } from "@/db/schema";
import type { ActionResult } from "@/types/course";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";

function revalidateAfterAnnouncementChange(courseId?: string) {
  revalidatePath("/teacher/courses");
  if (courseId) {
    revalidatePath(`/teacher/courses/${courseId}`);
    revalidatePath(`/teacher/courses/${courseId}/announcements`);
  }
  revalidatePath("/student");
}

export async function createAnnouncementAction(
  formData: unknown
): Promise<ActionResult<Announcement>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = createAnnouncementSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const announcement = await announcementService.createAnnouncement(teacher.id, parsed.data);
    revalidateAfterAnnouncementChange(parsed.data.courseId);
    return { success: true, data: announcement };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to create announcement.",
        t
      ),
    };
  }
}

export async function updateAnnouncementAction(
  formData: unknown,
  courseId: string
): Promise<ActionResult<Announcement>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = updateAnnouncementSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const announcement = await announcementService.updateAnnouncement(
      teacher.id,
      parsed.data.announcementId,
      parsed.data
    );
    revalidateAfterAnnouncementChange(courseId);
    return { success: true, data: announcement };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to update announcement.",
        t
      ),
    };
  }
}

export async function deleteAnnouncementAction(
  formData: unknown,
  courseId: string
): Promise<ActionResult<{ deleted: boolean }>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = announcementActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid announcement identifier.", t) };
  }

  try {
    await announcementService.deleteAnnouncement(teacher.id, parsed.data.announcementId);
    revalidateAfterAnnouncementChange(courseId);
    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to delete announcement.",
        t
      ),
    };
  }
}

export async function togglePinAnnouncementAction(
  formData: unknown,
  courseId: string
): Promise<ActionResult<Announcement>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = announcementActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid announcement identifier.", t) };
  }

  try {
    const announcement = await announcementService.togglePinAnnouncement(
      teacher.id,
      parsed.data.announcementId
    );
    revalidateAfterAnnouncementChange(courseId);
    return { success: true, data: announcement };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to toggle pin on announcement.",
        t
      ),
    };
  }
}
