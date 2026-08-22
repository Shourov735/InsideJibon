"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/permissions";
import {
  decideEnrollment,
  NotAuthorizedToDecideError,
} from "@/services/enrollments";
import { z } from "zod";

const decisionSchema = z.object({
  enrollmentId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

export interface DecisionActionResult {
  success: boolean;
  error?: string;
}

/**
 * Approves or rejects a pending enrollment request. Admins may decide on
 * any course; teachers only on their own (ownership enforced in the
 * service via an atomic conditional update).
 */
export async function decideEnrollmentAction(
  formData: unknown
): Promise<DecisionActionResult> {
  const actor = await requireUser();
  if (actor.role === "student") {
    return { success: false, error: "You are not allowed to manage enrollment requests." };
  }
  const parsed = decisionSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  try {
    await decideEnrollment({
      enrollmentId: parsed.data.enrollmentId,
      decidedBy: actor.id,
      decision: parsed.data.decision,
      requireCourseOwnershipOf: actor.role === "admin" ? null : actor.id,
    });

    revalidatePath("/admin");
    revalidatePath("/teacher");
    revalidatePath("/courses");

    return { success: true };
  } catch (error) {
    if (
      error instanceof NotAuthorizedToDecideError ||
      error instanceof Error
    ) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update request.",
      };
    }
    return { success: false, error: "Failed to update request." };
  }
}
