import "server-only";
import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  assignments,
  assignmentSubmissions,
  courses,
  enrollments,
  type Assignment,
  type AssignmentSubmission,
} from "@/db/schema";
import { isUuid } from "@/lib/utils";

/**
 * Shared authorization resolution and domain errors for the assignment service.
 *
 * Ownership is never supplied by the client — every operation resolves the
 * chain assignment → course → course.teacherId in the database and returns
 * null (never throws) when the chain does not end at the authenticated teacher,
 * so cross-teacher access behaves like "not found" instead of leaking whether
 * a resource exists.
 */

export class AssignmentNotFoundError extends Error {
  constructor() {
    super("Assignment not found.");
  }
}

export class AssignmentNotEditableError extends Error {
  constructor() {
    super(
      "Assignments can only be edited while in draft status. Unpublish or reopen the assignment first."
    );
  }
}

export class AssignmentLifecycleError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class AssignmentPublishBlockedError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class AssignmentCannotDeleteError extends Error {
  constructor() {
    super(
      "Published assignments cannot be permanently deleted. Unpublish or close the assignment instead."
    );
  }
}

export class SubmissionNotFoundError extends Error {
  constructor() {
    super("Submission not found.");
  }
}

export class LateSubmissionNotAllowedError extends Error {
  constructor() {
    super("Late submissions are not allowed for this assignment.");
  }
}

export class AssignmentAlreadyGradedError extends Error {
  constructor() {
    super("This submission has already been graded.");
  }
}

export class AssignmentClosedError extends Error {
  constructor() {
    super("This assignment is closed and no longer accepts submissions.");
  }
}

/** Course → teacher. Returns null when the teacher does not own it. */
export async function verifyCourseOwnership(
  teacherId: string,
  courseId: string
): Promise<{ id: string } | null> {
  if (!isUuid(courseId)) return null;
  const db = getDb();
  const [row] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .limit(1);
  return row ?? null;
}

/** Assignment → course → teacher. Returns null when the chain does not own it. */
export async function verifyAssignmentOwnership(
  teacherId: string,
  assignmentId: string
): Promise<{ assignment: Assignment } | null> {
  if (!isUuid(assignmentId)) return null;
  const db = getDb();
  const [row] = await db
    .select({ assignment: assignments })
    .from(assignments)
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .where(and(eq(assignments.id, assignmentId), eq(courses.teacherId, teacherId)))
    .limit(1);

  return row ? { assignment: row.assignment } : null;
}

/** Submission → assignment → course → teacher. Returns null when unauthorized. */
export async function verifySubmissionForTeacher(
  teacherId: string,
  submissionId: string
): Promise<{ submission: AssignmentSubmission; assignment: Assignment } | null> {
  if (!isUuid(submissionId)) return null;
  const db = getDb();
  const [row] = await db
    .select({
      submission: assignmentSubmissions,
      assignment: assignments,
    })
    .from(assignmentSubmissions)
    .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .where(
      and(eq(assignmentSubmissions.id, submissionId), eq(courses.teacherId, teacherId))
    )
    .limit(1);

  if (!row) return null;
  return { submission: row.submission, assignment: row.assignment };
}

/**
 * Student access: assignment must be visible to enrolled students of a
 * published course. Both `published` AND `closed` assignments remain
 * visible — students must always be able to view their submissions and
 * grades. Whether new submission ACTIVITY is allowed is decided separately
 * by isAssignmentOpen()/status gates in the mutation paths, never here.
 * Returns null otherwise (behaves like Not Found).
 */
export async function verifyStudentAssignmentAccess(
  studentId: string,
  assignmentId: string
): Promise<{ assignment: Assignment } | null> {
  if (!isUuid(assignmentId)) return null;
  const db = getDb();
  const [row] = await db
    .select({ assignment: assignments })
    .from(assignments)
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(assignments.id, assignmentId),
        inArray(assignments.status, ["published", "closed"]),
        eq(courses.status, "published"),
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, "active")
      )
    )
    .limit(1);

  return row ?? null;
}

/** Submission ownership for student: submission.student_id === authenticated student. */
export async function verifySubmissionOwnership(
  studentId: string,
  submissionId: string
): Promise<AssignmentSubmission | null> {
  if (!isUuid(submissionId)) return null;
  const db = getDb();
  const [row] = await db
    .select({ submission: assignmentSubmissions })
    .from(assignmentSubmissions)
    .where(
      and(
        eq(assignmentSubmissions.id, submissionId),
        eq(assignmentSubmissions.studentId, studentId)
      )
    )
    .limit(1);
  return row?.submission ?? null;
}

/** Guards structural mutation of an assignment: only draft assignments are editable. */
export function assertDraftAssignment(assignment: Assignment): void {
  if (assignment.status !== "draft") {
    throw new AssignmentNotEditableError();
  }
}

/**
 * Whether the assignment currently accepts new submission activity (drafts,
 * uploads, submits). Server time decides deadline state — never client time.
 */
export function isAssignmentOpen(assignment: Assignment, now: Date = new Date()): boolean {
  if (assignment.status !== "published") return false;
  if (assignment.dueAt && now > assignment.dueAt) {
    return assignment.allowLateSubmission;
  }
  return true;
}

/** Server-side lateness decision relative to the assignment's due date. */
export function isLateSubmission(
  assignment: Assignment,
  submittedAt: Date = new Date()
): boolean {
  if (!assignment.dueAt) return false;
  return submittedAt > assignment.dueAt;
}

/**
 * Whether the student may replace/re-submit work in this submission:
 * graded is final; past the deadline only when late submissions are allowed.
 */
export function canResubmit(
  assignment: Assignment,
  submission: AssignmentSubmission,
  now: Date = new Date()
): boolean {
  if (assignment.status !== "published") return false;
  if (submission.status === "graded" || submission.status === "not_submitted") return false;
  if (submission.status === "submitted") {
    // Already submitted: resubmission follows the same deadline policy.
    if (assignment.dueAt && now > assignment.dueAt) {
      return assignment.allowLateSubmission;
    }
    return true;
  }
  // draft
  return true;
}