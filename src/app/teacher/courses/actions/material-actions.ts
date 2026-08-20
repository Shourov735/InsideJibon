"use server";

import { revalidatePath } from "next/cache";

import { requireTeacher } from "@/lib/permissions";
import { getDefaultStorage } from "@/lib/storage";
import {
  deleteMaterialSchema,
  updateMaterialSchema,
  uploadMaterialSchema,
} from "@/schemas/material";
import * as materialService from "@/services/materials";
import type { ActionResult } from "@/types/course";
import type { MaterialSummary } from "@/types/material";

const DOWNLOAD_REVALIDATE_PATHS = [
  "/teacher/courses",
  "/student",
];

function revalidateAfterMaterialChange(courseId?: string) {
  for (const path of DOWNLOAD_REVALIDATE_PATHS) revalidatePath(path);
  if (courseId) {
    revalidatePath(`/teacher/courses/${courseId}`);
    revalidatePath(`/teacher/courses/${courseId}/builder`);
  }
}

/**
 * Uploads a course material to a lesson owned by the authenticated teacher.
 * The FormData payload carries the file plus the lesson ID; identity,
 * ownership, file type and size are all validated server-side. The storage
 * backend is resolved lazily inside the service (R2 on Workers).
 */
export async function uploadMaterialAction(
  formData: FormData,
  courseId?: string
): Promise<ActionResult<MaterialSummary>> {
  const teacher = await requireTeacher();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "No file was uploaded." };
  }

  const metadata: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    if (key !== "file") metadata[key] = value;
  }

  const parsed = uploadMaterialSchema.safeParse(metadata);
  if (!parsed.success) {
    return { success: false, error: "Invalid lesson identifier." };
  }

  try {
    const material = await materialService.uploadMaterial(
      teacher.id,
      parsed.data,
      file,
      getDefaultStorage()
    );
    revalidateAfterMaterialChange(courseId);
    return { success: true, data: material };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to upload material.",
    };
  }
}

/**
 * Deletes a material the authenticated teacher owns.
 */
export async function deleteMaterialAction(
  formData: unknown,
  courseId?: string
): Promise<ActionResult<{ deleted: boolean }>> {
  const teacher = await requireTeacher();
  const parsed = deleteMaterialSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: "Invalid material identifier." };
  }

  try {
    await materialService.deleteMaterial(
      teacher.id,
      parsed.data.materialId,
      getDefaultStorage()
    );
    revalidateAfterMaterialChange(courseId);
    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete material.",
    };
  }
}

/**
 * Renames a material the authenticated teacher owns.
 */
export async function updateMaterialAction(
  formData: unknown,
  courseId?: string
): Promise<ActionResult<MaterialSummary>> {
  const teacher = await requireTeacher();
  const parsed = updateMaterialSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: "Invalid material data." };
  }

  try {
    const material = await materialService.updateMaterial(
      teacher.id,
      parsed.data.materialId,
      parsed.data
    );
    revalidateAfterMaterialChange(courseId);
    return { success: true, data: material };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update material.",
    };
  }
}