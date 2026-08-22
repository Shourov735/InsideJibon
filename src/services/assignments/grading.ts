import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  assignmentSubmissionFiles,
  assignmentSubmissions,
  type Assignment,
  type AssignmentSubmission,
  type AssignmentSubmissionFile,
} from "@/db/schema";
import { isUuid } from "@/lib/utils";
import { createNotification } from "@/services/notifications";
import {
  AssignmentNotFoundError,
  SubmissionNotFoundError,
  verifyAssignmentOwnership,
  verifySubmissionForTeacher,
} from "./access";

/**
 * Teacher grading domain: reviewing submissions, awarding points/feedback.
 *
 * Authorization: every read/write resolves submission → assignment → course →
 * teacherId in the database; anything else behaves like Not Found.
 * Grading is allowed on `submitted` work; re-grading overwrites points,
 * feedback, grader and timestamp in one atomic UPDATE.
 */

export class SubmissionNotGradeableError extends Error {
  constructor() {
    super("Only submitted work can be graded.");
  }
}

export class InvalidGradeError extends Error {
  constructor() {
    super("Points are outside the allowed range for this assignment.");
  }
}

export interface TeacherSubmissionSummary {
  id: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string;
  status: AssignmentSubmission["status"];
  submittedAt: Date | null;
  isLate: boolean;
  points: number | null;
  feedback: string | null;
  gradedAt: Date | null;
  createdAt: Date;
  fileCount: number;
}

export interface SubmissionDetail extends TeacherSubmissionSummary {
  assignment: Assignment;
  files: AssignmentSubmissionFile[];
}

export interface SubmissionStatistics {
  totalEnrolled: number;
  submittedCount: number;
  gradedCount: number;
  lateCount: number;
  averageScore: number | null;
}

/** All submissions for a teacher-owned assignment, newest first. */
export async function getSubmissionsForAssignment(
  teacherId: string,
  assignmentId: string
): Promise<TeacherSubmissionSummary[]> {
  const resolved = await verifyAssignmentOwnership(teacherId, assignmentId);
  if (!resolved) throw new AssignmentNotFoundError();

  const db = getDb();
  const { users } = await import("@/db/schema");

  const rows = await db
    .select({
      submission: assignmentSubmissions,
      studentName: users.name,
      studentEmail: users.email,
    })
    .from(assignmentSubmissions)
    .innerJoin(users, eq(assignmentSubmissions.studentId, users.id))
    .where(eq(assignmentSubmissions.assignmentId, assignmentId))
    .orderBy(desc(assignmentSubmissions.createdAt));

  const fileCounts = await getFileCountsBySubmission(rows.map((r) => r.submission.id));

  return rows.map((row) => ({
    id: row.submission.id,
    studentId: row.submission.studentId,
    studentName: row.studentName,
    studentEmail: row.studentEmail,
    status: row.submission.status,
    submittedAt: row.submission.submittedAt,
    isLate: row.submission.isLate,
    points: row.submission.points,
    feedback: row.submission.feedback,
    gradedAt: row.submission.gradedAt,
    createdAt: row.submission.createdAt,
    fileCount: fileCounts.get(row.submission.id) ?? 0,
  }));
}

async function getFileCountsBySubmission(submissionIds: string[]): Promise<Map<string, number>> {
  if (submissionIds.length === 0) return new Map();
  const db = getDb();
  const rows = await db
    .select({ submissionId: assignmentSubmissionFiles.submissionId })
    .from(assignmentSubmissionFiles)
    .where(inArray(assignmentSubmissionFiles.submissionId, submissionIds));

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.submissionId, (map.get(row.submissionId) ?? 0) + 1);
  }
  return map;
}

/** Full grading view of one teacher-owned submission (null when not theirs). */
export async function getSubmissionDetailForTeacher(
  teacherId: string,
  submissionId: string
): Promise<SubmissionDetail | null> {
  if (!isUuid(submissionId)) return null;

  const resolved = await verifySubmissionForTeacher(teacherId, submissionId);
  if (!resolved) return null;

  const { submission, assignment } = resolved;
  const db = getDb();
  const { users } = await import("@/db/schema");

  const [student] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, submission.studentId))
    .limit(1);

  const files = await db
    .select()
    .from(assignmentSubmissionFiles)
    .where(eq(assignmentSubmissionFiles.submissionId, submissionId))
    .orderBy(assignmentSubmissionFiles.createdAt);

  return {
    id: submission.id,
    studentId: submission.studentId,
    studentName: student?.name ?? null,
    studentEmail: student?.email ?? "",
    status: submission.status,
    submittedAt: submission.submittedAt,
    isLate: submission.isLate,
    points: submission.points,
    feedback: submission.feedback,
    gradedAt: submission.gradedAt,
    createdAt: submission.createdAt,
    fileCount: files.length,
    assignment,
    files,
  };
}

/**
 * Awards (or overwrites) a grade on a submitted piece of work.
 * Points are bounded by THIS assignment's max_points, enforced here even
 * though the action layer also validates against the global cap.
 */
export async function gradeSubmission(
  teacherId: string,
  submissionId: string,
  points: number,
  feedback: string | null
): Promise<AssignmentSubmission> {
  if (!isUuid(submissionId)) throw new SubmissionNotFoundError();

  const resolved = await verifySubmissionForTeacher(teacherId, submissionId);
  if (!resolved) throw new SubmissionNotFoundError();

  const { submission, assignment } = resolved;

  if (submission.status !== "submitted" && submission.status !== "graded") {
    throw new SubmissionNotGradeableError();
  }
  if (!Number.isInteger(points) || points < 0 || points > assignment.maxPoints) {
    throw new InvalidGradeError();
  }

  const db = getDb();
  const now = new Date();

  // Atomic conditional update: only submitted/graded rows can transition,
  // so a draft flip racing this write cannot be graded by accident.
  const updatedRows = await db
    .update(assignmentSubmissions)
    .set({
      status: "graded",
      points,
      feedback: feedback?.trim() ? feedback.trim() : null,
      gradedAt: now,
      gradedBy: teacherId,
      updatedAt: now,
    })
    .where(
      and(
        eq(assignmentSubmissions.id, submissionId),
        inArray(assignmentSubmissions.status, ["submitted", "graded"])
      )
    )
    .returning();

  if (updatedRows.length === 0) throw new SubmissionNotGradeableError();

  await createNotification(submission.studentId, {
    type: "assignment_graded",
    title: `Assignment Graded: ${assignment.title}`,
    body: `Your submission has been graded. Points awarded: ${points}/${assignment.maxPoints}.`,
    link: "/student/notifications"
  });

  return updatedRows[0];
}

/** Aggregate progress numbers for an assignment's grading dashboard. */
export async function getAssignmentStatistics(
  teacherId: string,
  assignmentId: string
): Promise<SubmissionStatistics> {
  const resolved = await verifyAssignmentOwnership(teacherId, assignmentId);
  if (!resolved) throw new AssignmentNotFoundError();

  const db = getDb();
  const { enrollments } = await import("@/db/schema");
  const { count } = await import("drizzle-orm");

  const [totalResult] = await db
    .select({ value: count() })
    .from(enrollments)
    .where(eq(enrollments.courseId, resolved.assignment.courseId));

  const rows = await db
    .select({
      status: assignmentSubmissions.status,
      isLate: assignmentSubmissions.isLate,
      points: assignmentSubmissions.points,
    })
    .from(assignmentSubmissions)
    .where(eq(assignmentSubmissions.assignmentId, assignmentId));

  let submittedCount = 0;
  let gradedCount = 0;
  let lateCount = 0;
  let totalPoints = 0;

  for (const row of rows) {
    if (row.status === "submitted" || row.status === "graded") {
      submittedCount += 1;
      if (row.isLate) lateCount += 1;
    }
    if (row.status === "graded" && row.points !== null) {
      gradedCount += 1;
      totalPoints += row.points;
    }
  }

  return {
    totalEnrolled: Number(totalResult?.value ?? 0),
    submittedCount,
    gradedCount,
    lateCount,
    averageScore: gradedCount > 0 ? Math.round((totalPoints / gradedCount) * 100) / 100 : null,
  };
}

/** Files of a teacher-owned submission (null when unauthorized). */
export async function getSubmissionFilesForTeacher(
  teacherId: string,
  submissionId: string
): Promise<AssignmentSubmissionFile[] | null> {
  if (!isUuid(submissionId)) return null;
  const resolved = await verifySubmissionForTeacher(teacherId, submissionId);
  if (!resolved) return null;

  const db = getDb();
  return db
    .select()
    .from(assignmentSubmissionFiles)
    .where(eq(assignmentSubmissionFiles.submissionId, submissionId))
    .orderBy(assignmentSubmissionFiles.createdAt);
}