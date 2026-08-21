"use server";

import { revalidatePath } from "next/cache";

import { requireTeacher } from "@/lib/permissions";
import { getDefaultStorage } from "@/lib/storage";
import {
  assignmentActionByIdSchema,
  createAssignmentSchema,
  gradeSubmissionSchema,
  updateAssignmentSchema,
} from "@/schemas/assignment";
import * as assignmentService from "@/services/assignments";
import type { Assignment } from "@/db/schema";
import type { ActionResult } from "@/types/course";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";

function revalidateAfterAssignmentChange(courseId?: string, assignmentId?: string) {
  revalidatePath("/teacher/courses");
  if (courseId) {
    revalidatePath(`/teacher/courses/${courseId}`);
    revalidatePath(`/teacher/courses/${courseId}/assignments`);
  }
  if (assignmentId) {
    revalidatePath(`/teacher/assignments/${assignmentId}`);
  }
  // Students see published assignments inside their course pages.
  revalidatePath("/student");
}

/**
 * Creates a new draft assignment under one of the authenticated teacher's
 * courses. Structural edits are only possible while the assignment is draft.
 */
export async function createAssignmentAction(
  formData: unknown
): Promise<ActionResult<Assignment>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = createAssignmentSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const assignment = await assignmentService.createAssignment(teacher.id, parsed.data);
    revalidateAfterAssignmentChange(parsed.data.courseId, assignment.id);
    return { success: true, data: assignment };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to create assignment.",
        t
      ),
    };
  }
}

/**
 * Updates assignment metadata. Only draft assignments are editable; the
 * course binding cannot be changed after creation.
 */
export async function updateAssignmentAction(
  formData: unknown
): Promise<ActionResult<Assignment>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = updateAssignmentSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const assignment = await assignmentService.updateAssignment(
      teacher.id,
      parsed.data.assignmentId,
      parsed.data
    );
    revalidateAfterAssignmentChange(assignment.courseId, assignment.id);
    return { success: true, data: assignment };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to update assignment.",
        t
      ),
    };
  }
}

/**
 * Publishes an assignment after authoritative precondition validation.
 */
export async function publishAssignmentAction(
  formData: unknown
): Promise<ActionResult<Assignment>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = assignmentActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid assignment identifier.", t) };
  }

  try {
    const assignment = await assignmentService.publishAssignment(
      teacher.id,
      parsed.data.assignmentId
    );
    revalidateAfterAssignmentChange(assignment.courseId, assignment.id);
    return { success: true, data: assignment };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to publish assignment.",
        t
      ),
    };
  }
}

/**
 * Returns a published assignment to draft so it can be edited again.
 */
export async function unpublishAssignmentAction(
  formData: unknown
): Promise<ActionResult<Assignment>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = assignmentActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid assignment identifier.", t) };
  }

  try {
    const assignment = await assignmentService.unpublishAssignment(
      teacher.id,
      parsed.data.assignmentId
    );
    revalidateAfterAssignmentChange(assignment.courseId, assignment.id);
    return { success: true, data: assignment };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to unpublish assignment.",
        t
      ),
    };
  }
}

/**
 * Closes a published assignment: no new submissions, grading continues.
 */
export async function closeAssignmentAction(
  formData: unknown
): Promise<ActionResult<Assignment>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = assignmentActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid assignment identifier.", t) };
  }

  try {
    const assignment = await assignmentService.closeAssignment(
      teacher.id,
      parsed.data.assignmentId
    );
    revalidateAfterAssignmentChange(assignment.courseId, assignment.id);
    return { success: true, data: assignment };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to close assignment.",
        t
      ),
    };
  }
}

/**
 * Reopens a closed assignment back to published.
 */
export async function reopenAssignmentAction(
  formData: unknown
): Promise<ActionResult<Assignment>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = assignmentActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid assignment identifier.", t) };
  }

  try {
    const assignment = await assignmentService.reopenAssignment(
      teacher.id,
      parsed.data.assignmentId
    );
    revalidateAfterAssignmentChange(assignment.courseId, assignment.id);
    return { success: true, data: assignment };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to reopen assignment.",
        t
      ),
    };
  }
}

/**
 * Permanently deletes a draft or closed assignment and best-effort cleans up
 * its submission files from storage.
 */
export async function deleteAssignmentAction(
  formData: unknown,
  courseId?: string
): Promise<ActionResult<{ deleted: boolean }>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = assignmentActionByIdSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: localizeMessage("Invalid assignment identifier.", t) };
  }

  try {
    await assignmentService.deleteAssignment(
      teacher.id,
      parsed.data.assignmentId,
      getDefaultStorage()
    );
    revalidateAfterAssignmentChange(courseId);
    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to delete assignment.",
        t
      ),
    };
  }
}

/**
 * Awards (or overwrites) points and feedback on a submitted piece of work.
 * Points are bounded by the assignment's own max_points in the service layer.
 */
export async function gradeSubmissionAction(
  formData: unknown
): Promise<ActionResult<{ graded: boolean }>> {
  const t = await getTranslator();
  const teacher = await requireTeacher();
  const parsed = gradeSubmissionSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await assignmentService.gradeSubmission(
      teacher.id,
      parsed.data.submissionId,
      Number(parsed.data.points),
      typeof parsed.data.feedback === "string" ? parsed.data.feedback : null
    );
    revalidatePath("/student");
    return { success: true, data: { graded: true } };
  } catch (error) {
    return {
      success: false,
      error: localizeMessage(
        error instanceof Error ? error.message : "Failed to grade submission.",
        t
      ),
    };
  }
}