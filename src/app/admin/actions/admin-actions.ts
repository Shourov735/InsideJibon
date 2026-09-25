"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/permissions";
import { updateUserRole } from "@/services/admin/admin";
import { getDb } from "@/db";
import { courses, type Role } from "@/db/schema";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";
import { invalidateTags } from "@/services/cache/invalidate";
import { z } from "zod";

const updateUserRoleSchema = z.object({
  userId: z.string(),
  newRole: z.enum(["student", "teacher", "admin"]),
});

export async function updateUserRoleAction(formData: unknown) {
  const admin = await requireAdmin();
  const t = await getTranslator();

  const parsed = updateUserRoleSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
    };
  }

  try {
    const updatedUser = await updateUserRole(admin.id, parsed.data.userId, parsed.data.newRole as Role);
    revalidatePath("/admin");
    await invalidateTags(["catalog:list", `teacher:${parsed.data.userId}`], {
      reason: "admin.role_change",
      actorId: admin.id,
    });
    return { success: true, data: updatedUser };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to update role.",
        t
      ),
    };
  }
}

const updateCourseStatusSchema = z.object({
  courseId: z.string().uuid(),
  status: z.enum(["draft", "published", "archived"]),
});

/**
 * Updates a course's approval/publication status from admin dashboard.
 */
export async function updateCourseStatusAction(formData: unknown) {
  const admin = await requireAdmin();
  const t = await getTranslator();

  const parsed = updateCourseStatusSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
    };
  }

  try {
    const db = getDb();
    const [updated] = await db
      .update(courses)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(courses.id, parsed.data.courseId))
      .returning();

    if (!updated) {
      return {
        success: false,
        error: localizeMessage("Course not found.", t),
      };
    }

    revalidatePath("/admin");
    revalidatePath("/courses");
    if (updated.slug) {
      revalidatePath(`/courses/${updated.slug}`);
      await invalidateTags([`course:${updated.slug}`, "catalog:list"], {
        reason: "admin.course_status_change",
        actorId: admin.id,
      });
    }

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to update course status.",
        t
      ),
    };
  }
}

