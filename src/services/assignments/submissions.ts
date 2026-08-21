import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db";
import {
  assignmentSubmissionFiles,
  assignmentSubmissions,
  assignments,
  courses,
  enrollments,
  type Assignment,
  type AssignmentSubmission,
  type AssignmentSubmissionFile,
} from "@/db/schema";
import { getDefaultStorage, type Storage } from "@/lib/storage";
import {
  buildAssignmentStorageKey,
  validateAssignmentFile,
} from "@/schemas/assignment";
import { isUuid } from "@/lib/utils";
import {
  AssignmentAlreadyGradedError,
  AssignmentClosedError,
  AssignmentNotFoundError,
  isAssignmentOpen,
  isLateSubmission,
  LateSubmissionNotAllowedError,
  SubmissionNotFoundError,
  verifyStudentAssignmentAccess,
  verifySubmissionForTeacher,
  verifySubmissionOwnership,
} from "./access";

/**
 * Student submission domain: draft lifecycle, submit/resubmit, and files.
 *
 * Concurrency model (neon-http has NO transactions):
 * - one row per (assignment, student) is guaranteed by a UNIQUE constraint;
 * - creation races are absorbed with INSERT ... ON CONFLICT DO NOTHING
 *   followed by a re-select;
 * - status transitions to `submitted` use an atomic conditional UPDATE keyed
 *   on the allowed source statuses, so double-submits cannot corrupt state;
 * - deadline/lateness decisions use server time only.
 */

export class FileTooLargeError extends Error {
  constructor() {
    super("This file exceeds the maximum size allowed for this assignment.");
  }
}

export class UnsupportedFileTypeError extends Error {
  constructor() {
    super("This file type is not allowed for this assignment.");
  }
}

export class InvalidFileError extends Error {
  constructor() {
    super("The uploaded file is invalid.");
  }
}

export class UploadFailedError extends Error {
  constructor() {
    super("Upload failed. Please try again.");
  }
}

/** Minimal structural type accepted from web `File` objects. */
export interface UploadableSubmissionFile {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface StudentAssignmentSummary {
  assignment: Assignment;
  submission: AssignmentSubmission | null;
  /** Student may create/save a draft or submit right now. */
  canSubmit: boolean;
  /** A submitted-but-not-graded submission may be replaced. */
  canResubmit: boolean;
}

/** Published + closed assignments of one of the student's enrolled courses. */
async function listVisibleAssignmentsForEnrolledCourse(
  studentId: string,
  courseId: string
): Promise<Assignment[] | null> {
  if (!isUuid(courseId)) return null;
  const db = getDb();

  const [enrolled] = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(courses.id, courseId),
        eq(courses.status, "published")
      )
    )
    .limit(1);
  if (!enrolled) return null;

  return db
    .select()
    .from(assignments)
    .where(
      and(
        eq(assignments.courseId, courseId),
        inArray(assignments.status, ["published", "closed"])
      )
    )
    .orderBy(desc(assignments.createdAt));
}

/** Assignments + the student's own submission state for a course page. */
export async function getStudentCourseAssignmentsWithStatus(
  studentId: string,
  courseId: string
): Promise<StudentAssignmentSummary[] | null> {
  const courseAssignments = await listVisibleAssignmentsForEnrolledCourse(
    studentId,
    courseId
  );
  if (courseAssignments === null) return null;

  const db = getDb();
  const assignmentIds = courseAssignments.map((a) => a.id);
  const submissions = assignmentIds.length
    ? await db
        .select()
        .from(assignmentSubmissions)
        .where(
          and(
            eq(assignmentSubmissions.studentId, studentId),
            inArray(assignmentSubmissions.assignmentId, assignmentIds)
          )
        )
    : [];

  const byAssignment = new Map(submissions.map((s) => [s.assignmentId, s]));
  const now = new Date();

  return courseAssignments.map((assignment) => {
    const submission = byAssignment.get(assignment.id) ?? null;
    const open = isAssignmentOpen(assignment, now);
    const resubmittable =
      submission !== null && submission.status === "submitted"
        ? isAssignmentOpen(assignment, now)
        : false;

    return {
      assignment,
      submission,
      canSubmit:
        open &&
        (submission === null ||
          submission.status === "not_submitted" ||
          submission.status === "draft" ||
          resubmittable),
      canResubmit: resubmittable,
    };
  });
}

/** The student's own submission for an assignment, or null when none exists. */
export async function getStudentSubmission(
  studentId: string,
  assignmentId: string
): Promise<AssignmentSubmission | null> {
  if (!isUuid(assignmentId)) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(assignmentSubmissions)
    .where(
      and(
        eq(assignmentSubmissions.assignmentId, assignmentId),
        eq(assignmentSubmissions.studentId, studentId)
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Creates the student's submission row (status=draft) or returns the existing
 * one. Safe under concurrency via the unique constraint + conflict clause.
 * A graded submission is final and can never re-enter the workflow.
 */
export async function startOrResumeSubmission(
  studentId: string,
  assignmentId: string
): Promise<AssignmentSubmission> {
  const resolved = await verifyStudentAssignmentAccess(studentId, assignmentId);
  if (!resolved) throw new AssignmentNotFoundError();

  const { assignment } = resolved;
  const now = new Date();
  if (!isAssignmentOpen(assignment, now)) {
    throw new AssignmentClosedError();
  }

  const db = getDb();

  const [existing] = await db
    .select()
    .from(assignmentSubmissions)
    .where(
      and(
        eq(assignmentSubmissions.assignmentId, assignmentId),
        eq(assignmentSubmissions.studentId, studentId)
      )
    )
    .limit(1);

  if (existing) {
    if (existing.status === "graded") throw new AssignmentAlreadyGradedError();
    if (existing.status === "draft") return existing;
    // submitted: only touch it when resubmission is still permitted.
    if (!isAssignmentOpen(assignment, now)) throw new AssignmentClosedError();
    return existing;
  }

  const inserted = await db
    .insert(assignmentSubmissions)
    .values({
      assignmentId,
      studentId,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0) return inserted[0];

  // Lost a creation race — the winner's row is ours to use.
  const [winner] = await db
    .select()
    .from(assignmentSubmissions)
    .where(
      and(
        eq(assignmentSubmissions.assignmentId, assignmentId),
        eq(assignmentSubmissions.studentId, studentId)
      )
    )
    .limit(1);
  if (!winner) throw new AssignmentNotFoundError();
  if (winner.status === "graded") throw new AssignmentAlreadyGradedError();
  return winner;
}

/**
 * Atomically flips the student's submission to `submitted`, stamping server
 * time and lateness. The conditional WHERE makes concurrent/double submits
 * idempotent-ish: the first wins, later calls see status already `submitted`
 * and simply confirm it while the deadline policy still holds.
 */
export async function submitSubmission(
  studentId: string,
  assignmentId: string
): Promise<AssignmentSubmission> {
  const resolved = await verifyStudentAssignmentAccess(studentId, assignmentId);
  if (!resolved) throw new AssignmentNotFoundError();

  const { assignment } = resolved;

  // Precise precedence: lifecycle state first, then deadline policy.
  if (assignment.status !== "published") {
    throw new AssignmentClosedError();
  }
  const now = new Date();
  const late = isLateSubmission(assignment, now);
  if (late && !assignment.allowLateSubmission) {
    throw new LateSubmissionNotAllowedError();
  }

  // Ensure a row exists (creates a draft first when the student submits
  // directly without ever saving a draft).
  const submission = await startOrResumeSubmission(studentId, assignmentId);

  if (late && !assignment.allowLateSubmission) {
    // Re-checked post-resume in case the deadline crossed mid-flight.
    throw new LateSubmissionNotAllowedError();
  }

  const db = getDb();
  const updatedRows = await db
    .update(assignmentSubmissions)
    .set({
      status: "submitted",
      submittedAt: now,
      isLate: late,
      updatedAt: now,
    })
    .where(
      and(
        eq(assignmentSubmissions.id, submission.id),
        eq(assignmentSubmissions.studentId, studentId),
        inArray(assignmentSubmissions.status, ["draft", "submitted"])
      )
    )
    .returning();

  if (updatedRows.length === 0) {
    // Either graded in the meantime or closed — reload to report precisely.
    const [current] = await db
      .select()
      .from(assignmentSubmissions)
      .where(eq(assignmentSubmissions.id, submission.id))
      .limit(1);
    if (current?.status === "graded") throw new AssignmentAlreadyGradedError();
    throw new AssignmentClosedError();
  }

  return updatedRows[0];
}

/**
 * Stores an uploaded file for the student's own submission and records it in
 * the database. Validation runs against THIS assignment's configured mime
 * types and size cap; storage keys are fully server-derived.
 *
 * Ordering mirrors materials: DB row first, R2 write second, rollback the row
 * when the object write fails (no transactions available).
 */
export async function uploadSubmissionFile(
  studentId: string,
  assignmentId: string,
  file: UploadableSubmissionFile,
  storage: Storage = getDefaultStorage()
): Promise<AssignmentSubmissionFile> {
  const resolved = await verifyStudentAssignmentAccess(studentId, assignmentId);
  if (!resolved) throw new AssignmentNotFoundError();

  const { assignment } = resolved;

  const submission = await getStudentSubmission(studentId, assignmentId);
  if (!submission) throw new SubmissionNotFoundError();

  if (submission.status === "graded") throw new AssignmentAlreadyGradedError();

  const now = new Date();
  if (assignment.status !== "published") {
    throw new AssignmentClosedError();
  }
  const submissionWindowOpen =
    !isLateSubmission(assignment, now) || assignment.allowLateSubmission;
  if (!submissionWindowOpen) {
    throw new LateSubmissionNotAllowedError();
  }
  if (submission.status === "not_submitted") {
    throw new AssignmentClosedError();
  }

  const validation = validateAssignmentFile(
    file,
    assignment.allowedFileTypes,
    assignment.maxFileSize
  );
  if (!validation.ok) {
    switch (validation.reason) {
      case "too-large":
        throw new FileTooLargeError();
      case "unsupported-type":
        throw new UnsupportedFileTypeError();
      default:
        throw new InvalidFileError();
    }
  }

  const fileId = randomUUID();
  const originalFilename = validation.file.filename;
  const storageKey = buildAssignmentStorageKey(
    assignment.courseId,
    assignmentId,
    submission.id,
    fileId,
    originalFilename
  );

  const db = getDb();
  const [row] = await db
    .insert(assignmentSubmissionFiles)
    .values({
      id: fileId,
      submissionId: submission.id,
      storageKey,
      originalFilename,
      mimeType: validation.file.mimeType,
      sizeBytes: validation.file.sizeBytes,
    })
    .returning();

  try {
    const bytes = await file.arrayBuffer();
    await storage.putObject({
      key: storageKey,
      body: bytes,
      contentType: validation.file.mimeType,
      customMetadata: {
        fileId,
        submissionId: submission.id,
        assignmentId,
        studentId,
      },
    });
  } catch (error) {
    console.warn("R2 put failed after DB insert; rolling back file row:", error);
    await db
      .delete(assignmentSubmissionFiles)
      .where(eq(assignmentSubmissionFiles.id, fileId))
      .catch((rollbackError) => {
        console.error("Failed to roll back orphaned file row:", rollbackError);
      });
    throw new UploadFailedError();
  }

  // Keep the row's timestamp honest about activity on the submission.
  await db
    .update(assignmentSubmissions)
    .set({ updatedAt: new Date() })
    .where(eq(assignmentSubmissions.id, submission.id));

  return row;
}

/**
 * Removes a file from the student's OWN submission while the submission still
 * accepts changes (draft, or submitted while resubmission window is open).
 */
export async function deleteSubmissionFile(
  studentId: string,
  fileId: string,
  storage: Storage = getDefaultStorage()
): Promise<void> {
  if (!isUuid(fileId)) throw new SubmissionNotFoundError();

  const db = getDb();

  const [file] = await db
    .select({
      file: assignmentSubmissionFiles,
      submission: assignmentSubmissions,
      assignment: assignments,
    })
    .from(assignmentSubmissionFiles)
    .innerJoin(
      assignmentSubmissions,
      eq(assignmentSubmissionFiles.submissionId, assignmentSubmissions.id)
    )
    .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
    .where(
      and(
        eq(assignmentSubmissionFiles.id, fileId),
        eq(assignmentSubmissions.studentId, studentId)
      )
    )
    .limit(1);

  if (!file) throw new SubmissionNotFoundError();
  if (file.submission.status === "graded") throw new AssignmentAlreadyGradedError();

  const now = new Date();
  if (
    file.submission.status === "not_submitted" ||
    (file.submission.status === "submitted" && !isAssignmentOpen(file.assignment, now))
  ) {
    throw new AssignmentClosedError();
  }

  await db.delete(assignmentSubmissionFiles).where(eq(assignmentSubmissionFiles.id, fileId));

  // Best-effort object removal after the authoritative row delete.
  await storage.deleteObject(file.file.storageKey).catch((error) => {
    console.warn("Failed to delete submission file object:", file.file.storageKey, error);
  });
}

/** Files attached to the student's own submission (null when not theirs). */
export async function getSubmissionFilesForStudent(
  studentId: string,
  submissionId: string
): Promise<AssignmentSubmissionFile[] | null> {
  if (!isUuid(submissionId)) return null;
  const submission = await verifySubmissionOwnership(studentId, submissionId);
  if (!submission) return null;

  const db = getDb();
  return db
    .select()
    .from(assignmentSubmissionFiles)
    .where(eq(assignmentSubmissionFiles.submissionId, submissionId))
    .orderBy(assignmentSubmissionFiles.createdAt);
}

export interface ResolvableSubmissionFile {
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Role-aware resolution of a single submission file for download:
 * - students may fetch files from their OWN submissions only;
 * - teachers may fetch files from submissions to assignments they own;
 * everything else behaves like Not Found (null) without leaking existence.
 */
export async function resolveSubmissionFileForUser(
  userId: string,
  role: "student" | "teacher",
  submissionId: string,
  fileId: string
): Promise<ResolvableSubmissionFile | null> {
  if (!isUuid(submissionId) || !isUuid(fileId)) return null;

  const authorized =
    role === "student"
      ? (await verifySubmissionOwnership(userId, submissionId)) !== null
      : (await verifySubmissionForTeacher(userId, submissionId)) !== null;
  if (!authorized) return null;

  const db = getDb();
  const [file] = await db
    .select({
      storageKey: assignmentSubmissionFiles.storageKey,
      originalFilename: assignmentSubmissionFiles.originalFilename,
      mimeType: assignmentSubmissionFiles.mimeType,
      sizeBytes: assignmentSubmissionFiles.sizeBytes,
    })
    .from(assignmentSubmissionFiles)
    .where(
      and(
        eq(assignmentSubmissionFiles.id, fileId),
        eq(assignmentSubmissionFiles.submissionId, submissionId)
      )
    )
    .limit(1);

  return file ?? null;
}