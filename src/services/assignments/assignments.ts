import "server-only";
import { and, desc, eq, ilike, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  assignmentSubmissionFiles,
  assignmentSubmissions,
  assignments,
  courses,
  type Assignment,
  type AssignmentStatus,
} from "@/db/schema";
import { getDefaultStorage } from "@/lib/storage";
import { ALLOWED_ASSIGNMENT_MIME_TYPES } from "@/schemas/assignment";
import type {
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from "@/schemas/assignment";
import {
  assertDraftAssignment,
  AssignmentCannotDeleteError,
  AssignmentLifecycleError,
  AssignmentNotFoundError,
  AssignmentPublishBlockedError,
  verifyAssignmentOwnership,
  verifyCourseOwnership,
} from "./access";

export type { AssignmentStatus };

/**
 * Teacher assignment domain: lifecycle (draft → published → closed) and the
 * authoritative publish-precondition validation.
 */

export interface AssignmentWithCounts extends Assignment {
  submissionCount: number;
  gradedCount: number;
}

/**
 * Creates a new draft assignment associated with a course the teacher owns.
 */
export async function createAssignment(
  teacherId: string,
  input: CreateAssignmentInput
): Promise<Assignment> {
  const course = await verifyCourseOwnership(teacherId, input.courseId);
  if (!course) throw new AssignmentNotFoundError();

  const db = getDb();
  const [assignment] = await db
    .insert(assignments)
    .values({
      courseId: input.courseId,
      lessonId: input.lessonId ?? null,
      title: input.title.trim(),
      instructions: input.instructions.trim(),
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      maxPoints: Number(input.maxPoints),
      allowLateSubmission: input.allowLateSubmission,
      allowedFileTypes: input.allowedFileTypes,
      maxFileSize: Number(input.maxFileSize),
      status: "draft",
    })
    .returning();

  return assignment;
}

export interface TeacherAssignmentsFilter {
  q?: string;
  status?: AssignmentStatus;
  courseId?: string;
}

/**
 * Lists the teacher's assignments, optionally scoped to one of their courses.
 * Supports optional search query and status filter.
 */
export async function getTeacherAssignments(
  teacherId: string,
  filter?: TeacherAssignmentsFilter | string
): Promise<AssignmentWithCounts[]> {
  const db = getDb();

  // Backwards-compatible: accept a raw courseId string or a filter object
  const resolvedFilter: TeacherAssignmentsFilter =
    typeof filter === "string" ? { courseId: filter } : (filter ?? {});

  const conditions = [eq(courses.teacherId, teacherId)];
  if (resolvedFilter.courseId) {
    conditions.push(eq(courses.id, resolvedFilter.courseId));
  }
  if (resolvedFilter.status) {
    conditions.push(eq(assignments.status, resolvedFilter.status));
  }
  if (resolvedFilter.q) {
    conditions.push(ilike(assignments.title, `%${resolvedFilter.q}%`));
  }

  const rows = await db
    .select({ assignment: assignments })
    .from(assignments)
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .where(and(...conditions))
    .orderBy(desc(assignments.createdAt));

  const assignmentIds = rows.map((r) => r.assignment.id);
  const counts = await getSubmissionCountsByAssignment(assignmentIds);
  return rows.map((r) => ({
    ...r.assignment,
    submissionCount: counts.get(r.assignment.id)?.submissionCount ?? 0,
    gradedCount: counts.get(r.assignment.id)?.gradedCount ?? 0,
  }));
}

async function getSubmissionCountsByAssignment(
  assignmentIds: string[]
): Promise<Map<string, { submissionCount: number; gradedCount: number }>> {
  if (assignmentIds.length === 0) return new Map();
  const db = getDb();
  const rows = await db
    .select({
      assignmentId: assignmentSubmissions.assignmentId,
      status: assignmentSubmissions.status,
    })
    .from(assignmentSubmissions)
    .where(inArray(assignmentSubmissions.assignmentId, assignmentIds));

  const map = new Map<string, { submissionCount: number; gradedCount: number }>();
  for (const row of rows) {
    const entry = map.get(row.assignmentId) ?? { submissionCount: 0, gradedCount: 0 };
    entry.submissionCount += 1;
    if (row.status === "graded") entry.gradedCount += 1;
    map.set(row.assignmentId, entry);
  }
  return map;
}


/**
 * Fetches a single teacher-owned assignment by ID. Returns null (never throws)
 * so callers can render 404s without revealing whether the assignment exists.
 */
export async function getTeacherAssignmentById(
  teacherId: string,
  assignmentId: string
): Promise<Assignment | null> {
  const resolved = await verifyAssignmentOwnership(teacherId, assignmentId);
  return resolved?.assignment ?? null;
}

/**
 * Updates assignment metadata. The courseId in the payload must match the
 * assignment's current course — reassigning an assignment to a different
 * course is not supported in this phase.
 */
export async function updateAssignment(
  teacherId: string,
  assignmentId: string,
  input: UpdateAssignmentInput
): Promise<Assignment> {
  const resolved = await verifyAssignmentOwnership(teacherId, assignmentId);
  if (!resolved) throw new AssignmentNotFoundError();

  // Reject accidental course reassignment without leaking whether the assignment
  // exists (same generic error as a missing assignment).
  if (input.courseId !== resolved.assignment.courseId) {
    throw new AssignmentNotFoundError();
  }

  assertDraftAssignment(resolved.assignment);

  const db = getDb();
  const [updated] = await db
    .update(assignments)
    .set({
      title: input.title.trim(),
      instructions: input.instructions.trim(),
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      maxPoints: Number(input.maxPoints),
      allowLateSubmission: input.allowLateSubmission,
      allowedFileTypes: input.allowedFileTypes,
      maxFileSize: Number(input.maxFileSize),
      updatedAt: new Date(),
    })
    .where(eq(assignments.id, assignmentId))
    .returning();

  return updated;
}

/**
 * Evaluates the publishing preconditions for an assignment. This is the single
 * source of truth for "can this assignment be published" — the UI renders this
 * result, and publishAssignment enforces it again before writing.
 */
export async function validateAssignmentForPublishing(
  teacherId: string,
  assignmentId: string
): Promise<{ canPublish: boolean; errors: string[] }> {
  const assignment = await getTeacherAssignmentById(teacherId, assignmentId);
  if (!assignment) {
    return {
      canPublish: false,
      errors: ["Assignment does not exist or you do not have permission."],
    };
  }

  const errors: string[] = [];

  if (!assignment.title || assignment.title.trim().length < 3) {
    errors.push("Assignment title must be at least 3 characters long.");
  }

  if (!assignment.instructions || assignment.instructions.trim().length < 10) {
    errors.push("Assignment instructions must be at least 10 characters long.");
  }

  if (assignment.maxPoints < 1) {
    errors.push("Maximum points must be at least 1.");
  }

  if (assignment.dueAt && assignment.dueAt.getTime() <= Date.now()) {
    errors.push("Due date cannot be in the past.");
  }

  for (const mimeType of assignment.allowedFileTypes) {
    if (!ALLOWED_ASSIGNMENT_MIME_TYPES.has(mimeType)) {
      errors.push("One or more configured file types are not supported.");
      break;
    }
  }

  return { canPublish: errors.length === 0, errors };
}

/**
 * Publishes an assignment after full validation. Blocks publishing when
 * the invariants are violated.
 */
export async function publishAssignment(
  teacherId: string,
  assignmentId: string
): Promise<Assignment> {
  // Ownership first: unauthorized access must behave like Not Found
  const resolved = await verifyAssignmentOwnership(teacherId, assignmentId);
  if (!resolved) throw new AssignmentNotFoundError();

  const validation = await validateAssignmentForPublishing(teacherId, assignmentId);
  if (!validation.canPublish) {
    throw new AssignmentPublishBlockedError(
      `Cannot publish assignment:\n${validation.errors.map((e) => `• ${e}`).join("\n")}`
    );
  }

  const db = getDb();
  const [updated] = await db
    .update(assignments)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(assignments.id, assignmentId))
    .returning();

  return updated;
}

/**
 * Returns a published assignment to draft. Structural edits are only possible
 * in draft, so unpublishing is the way a teacher changes published content.
 */
export async function unpublishAssignment(
  teacherId: string,
  assignmentId: string
): Promise<Assignment> {
  const resolved = await verifyAssignmentOwnership(teacherId, assignmentId);
  if (!resolved) throw new AssignmentNotFoundError();
  if (resolved.assignment.status !== "published") {
    throw new AssignmentLifecycleError("Assignment is not currently published.");
  }

  const db = getDb();
  const [updated] = await db
    .update(assignments)
    .set({
      status: "draft",
      publishedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(assignments.id, assignmentId))
    .returning();

  return updated;
}

/**
 * Closes an assignment, preventing new submissions while keeping existing
 * submissions accessible for grading.
 */
export async function closeAssignment(
  teacherId: string,
  assignmentId: string
): Promise<Assignment> {
  const resolved = await verifyAssignmentOwnership(teacherId, assignmentId);
  if (!resolved) throw new AssignmentNotFoundError();
  if (resolved.assignment.status !== "published") {
    throw new AssignmentLifecycleError("Only published assignments can be closed.");
  }

  const db = getDb();
  const [updated] = await db
    .update(assignments)
    .set({
      status: "closed",
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(assignments.id, assignmentId))
    .returning();

  return updated;
}

/**
 * Reopens a closed assignment back to published.
 */
export async function reopenAssignment(
  teacherId: string,
  assignmentId: string
): Promise<Assignment> {
  const resolved = await verifyAssignmentOwnership(teacherId, assignmentId);
  if (!resolved) throw new AssignmentNotFoundError();
  if (resolved.assignment.status !== "closed") {
    throw new AssignmentLifecycleError("Only closed assignments can be reopened.");
  }

  const db = getDb();
  const [updated] = await db
    .update(assignments)
    .set({
      status: "published",
      closedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(assignments.id, assignmentId))
    .returning();

  return updated;
}

/**
 * Permanently deletes a draft or closed assignment. Published assignments
 * cannot be deleted — the teacher must unpublish or close first.
 *
 * Submission file rows cascade-delete; the corresponding R2 objects are
 * removed best-effort afterwards so storage does not accumulate orphans.
 */
export async function deleteAssignment(
  teacherId: string,
  assignmentId: string,
  storage: import("@/lib/storage").Storage = getDefaultStorage()
): Promise<void> {
  const resolved = await verifyAssignmentOwnership(teacherId, assignmentId);
  if (!resolved) throw new AssignmentNotFoundError();
  if (resolved.assignment.status === "published") {
    throw new AssignmentCannotDeleteError();
  }

  const db = getDb();

  const fileRows = await db
    .select({ storageKey: assignmentSubmissionFiles.storageKey })
    .from(assignmentSubmissionFiles)
    .innerJoin(
      assignmentSubmissions,
      eq(assignmentSubmissionFiles.submissionId, assignmentSubmissions.id)
    )
    .where(eq(assignmentSubmissions.assignmentId, assignmentId));

  await db.delete(assignments).where(eq(assignments.id, assignmentId));

  // Best-effort object cleanup after the authoritative DB delete.
  await Promise.allSettled(
    fileRows.map((f) =>
      storage.deleteObject(f.storageKey).catch((error) => {
        console.warn("Failed to delete assignment file object:", f.storageKey, error);
      })
    )
  );
}