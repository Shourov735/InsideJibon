"use server";

import { revalidatePath } from "next/cache";

import { requireStudent } from "@/lib/permissions";
import { enrollCourseSchema } from "@/schemas/learning";
import * as enrollmentService from "@/services/enrollments";
import type { ActionResult } from "@/types/course";
import type { Enrollment } from "@/types/learning";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";

export interface EnrollActionResultData {
  enrollment: Enrollment;
  courseSlug: string;
  alreadyRequested: boolean;
}

/**
 * Requests enrollment in a published course. Creates (or re-opens) a
 * `pending` request; teacher/admin approval grants course access.
 * The studentId always comes from the verified session, never the client.
 */
export async function enrollInCourseAction(
  formData: unknown
): Promise<ActionResult<EnrollActionResultData>> {
  const t = await getTranslator();
  const student = await requireStudent();
  const parsed = enrollCourseSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid course identifier.", t) };
  }

  try {
    const result = await enrollmentService.enrollStudent(
      student.id,
      parsed.data.courseId
    );

    revalidatePath("/courses");
    revalidatePath(`/courses/${result.course.slug}`);
    revalidatePath("/student");
    revalidatePath("/student/courses");
    revalidatePath("/admin");

    return {
      success: true,
      data: {
        enrollment: result.enrollment,
        courseSlug: result.course.slug,
        alreadyRequested: result.alreadyRequested,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to enroll in course.",
    };
  }
}