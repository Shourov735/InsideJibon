"use server";

import { revalidatePath } from "next/cache";

import { requireStudent } from "@/lib/permissions";
import { getDefaultStorage } from "@/lib/storage";
import {
  assignmentActionByIdSchema,
  deleteSubmissionFileSchema,
  submitAssignmentSchema,
  uploadSubmissionFileSchema,
} from "@/schemas/assignment";
import * as assignmentService from "@/services/assignments";
import { verifyStudentAssignmentAccess } from "@/services/assignments/access";
import type { ActionResult } from "@/types/course";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";

function revalidateAfterSubmissionChange(courseId?: string) {
  revalidatePath("/student");
  revalidatePath("/student/courses");
  if (courseId) {
    revalidatePath(`/student/courses/${courseId}/assignments`);
    revalidatePath(`/student/courses/${courseId}`);
  }
}

/**
 * Creates (or resumes) the student's draft submission for an assignment.
 * The submission is bound to the verified session's student ID.
 */
export async function startSubmissionAction(
  formData: unknown
): Promise<ActionResult<{ submissionId: string }>> {
  const t = await getTranslator();
  const student = await requireStudent();
  const parsed = assignmentActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid assignment identifier.", t) };
  }

  try {
    const submission = await assignmentService.startOrResumeSubmission(
      student.id,
      parsed.data.assignmentId
    );
    return { success: true, data: { submissionId: submission.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to prepare the submission.",
    };
  }
}

/**
 * Submits the student's work. Deadline and late policy are evaluated with
 * server time inside the service; the status flip is atomic.
 */
export async function submitAssignmentAction(
  formData: unknown
): Promise<ActionResult<{ submitted: boolean }>> {
  const t = await getTranslator();
  const student = await requireStudent();
  const parsed = submitAssignmentSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid assignment identifier.", t) };
  }

  try {
    const resolved = await verifyStudentAssignmentAccess(
      student.id,
      parsed.data.assignmentId
    );

    await assignmentService.submitSubmission(student.id, parsed.data.assignmentId);
    revalidateAfterSubmissionChange(resolved?.assignment.courseId);
    return { success: true, data: { submitted: true } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to submit the assignment.",
    };
  }
}

/**
 * Uploads a file into the student's own submission. Type/size are validated
 * against THIS assignment's constraints server-side; storage keys are fully
 * server-derived and never client-controlled.
 */
export async function uploadSubmissionFileAction(
  formData: FormData
): Promise<ActionResult<{ fileId: string }>> {
  const t = await getTranslator();
  const student = await requireStudent();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: localizeMessage("No file was uploaded.", t) };
  }

  const assignmentId = formData.get("assignmentId");
  const parsed = uploadSubmissionFileSchema.safeParse({
    assignmentId,
    file,
  });
  if (!parsed.success || typeof assignmentId !== "string") {
    return {
      success: false,
      error: localizeMessage("Invalid assignment identifier.", t),
    };
  }

  try {
    const stored = await assignmentService.uploadSubmissionFile(
      student.id,
      parsed.data.assignmentId,
      parsed.data.file,
      getDefaultStorage()
    );
    revalidateAfterSubmissionChange();
    return { success: true, data: { fileId: stored.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Upload failed. Please try again.",
    };
  }
}

/**
 * Removes a file from the student's own draft/in-window submission.
 */
export async function deleteSubmissionFileAction(
  formData: unknown
): Promise<ActionResult<{ deleted: boolean }>> {
  const student = await requireStudent();
  const parsed = deleteSubmissionFileSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: "Invalid file identifier." };
  }

  try {
    await assignmentService.deleteSubmissionFile(
      student.id,
      parsed.data.fileId,
      getDefaultStorage()
    );
    revalidateAfterSubmissionChange();
    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete the file.",
    };
  }
}