"use server";

import { revalidatePath } from "next/cache";

import { requireStudent } from "@/lib/permissions";
import { enrollCourseSchema } from "@/schemas/learning";
import * as enrollmentService from "@/services/enrollments";
import type { ActionResult } from "@/types/course";
import type { Enrollment } from "@/types/learning";

export interface EnrollActionResultData {
  enrollment: Enrollment;
  courseSlug: string;
  alreadyEnrolled: boolean;
}

/**
 * Enrolls the authenticated student in a course. Idempotent — a repeated
 * submission returns the existing enrollment with alreadyEnrolled: true.
 * The studentId always comes from the verified session, never the client.
 */
export async function enrollInCourseAction(
  formData: unknown
): Promise<ActionResult<EnrollActionResultData>> {
  const student = await requireStudent();
  const parsed = enrollCourseSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: "Invalid course identifier." };
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
    revalidatePath(`/student/courses/${parsed.data.courseId}/learn`);

    return {
      success: true,
      data: {
        enrollment: result.enrollment,
        courseSlug: result.course.slug,
        alreadyEnrolled: result.alreadyEnrolled,
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