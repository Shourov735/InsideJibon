"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/permissions";
import { updateUserRole } from "@/services/admin/admin";
import type { Role } from "@/db/schema";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";
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
