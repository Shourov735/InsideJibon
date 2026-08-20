"use server";

import { revalidatePath } from "next/cache";

import { requireStudent } from "@/lib/permissions";
import { startExamSchema, submitExamSchema } from "@/schemas/exam-attempt";
import * as examAttemptService from "@/services/exams/attempts";
import type { ActionResult } from "@/types/course";
import type { StartedAttempt, SubmittedExamResult } from "@/types/exam";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";

const EXAM_PATHS = (courseId: string, examId: string) => [
  `/student/courses/${courseId}/exams`,
  `/student/courses/${courseId}/exams/${examId}`,
  `/student/courses/${courseId}/exams/${examId}/result`,
];

/**
 * Starts a new attempt on a published exam of a course the student is
 * enrolled in. The server snapshots the exam content and enforces the
 * attempt limit; the returned payload contains NO correct answers.
 */
export async function startExamAction(
  formData: unknown
): Promise<ActionResult<StartedAttempt>> {
  const t = await getTranslator();
  const student = await requireStudent();
  const parsed = startExamSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid exam identifier.", t) };
  }

  try {
    const attempt = await examAttemptService.startExam(
      student.id,
      parsed.data.examId
    );
    revalidatePath(`/student/courses/${attempt.courseId}/exams`);
    return { success: true, data: attempt };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to start the exam.",
    };
  }
}

/**
 * Submits an attempt. Only question/option IDs are accepted — the score,
 * percentage and per-question results are computed server-side from the
 * attempt's snapshot. Duplicate submissions and foreign attempts are
 * rejected.
 */
export async function submitExamAction(
  formData: unknown
): Promise<ActionResult<SubmittedExamResult>> {
  const t = await getTranslator();
  const student = await requireStudent();
  const parsed = submitExamSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid submission data.", t) };
  }

  try {
    const result = await examAttemptService.submitExam(
      student.id,
      parsed.data.attemptId,
      parsed.data.answers
    );
    EXAM_PATHS(result.courseId, result.examId).forEach((p) => revalidatePath(p));
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to submit the exam.",
    };
  }
}