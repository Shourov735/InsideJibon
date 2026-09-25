"use server";

import { revalidatePath } from "next/cache";

import { requireStudent } from "@/lib/permissions";
import { repairStreak } from "@/services/gamification";
import type { ActionResult } from "@/types/course";

/**
 * R5 — server action that burns one streak freeze to repair a
 * broken streak. No inputs; the freeze consumption is keyed on the
 * authenticated student's id.
 */
export async function repairStreakAction(): Promise<
  ActionResult<{ currentDays: number }>
> {
  const student = await requireStudent();
  try {
    const result = await repairStreak(student.id);
    if (!result) {
      return {
        success: false,
        error:
          "No freeze available — or streak is not eligible for repair. Try again tomorrow.",
      };
    }
    revalidatePath("/student");
    revalidatePath("/student/courses");
    return { success: true, data: { currentDays: result.currentDays } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Repair failed.",
    };
  }
}