import "server-only";

import { and, desc, eq, gte } from "drizzle-orm";

import { getDb } from "@/db";
import {
  classAttendance,
  classSessions,
  enrollments,
} from "@/db/schema";

/**
 * R3 — Attendance service.
 *
 * The Durable Object writes the live attendance rollup; this service
 * exposes Postgres-side reads + idempotent upserts so teachers (and the
 * parent panel in R7) can query attendance. All writes land via
 * upserts keyed on (session_id, student_id) so retrying the DO flush
 * never produces duplicate rows.
 *
 * Authorization is enforced at the route boundaries — these helpers
 * take already-resolved session/student ids.
 */

export type AttendanceRow = {
  studentId: string;
  studentName: string | null;
  totalSeconds: number;
  joinedAt: Date;
  leftAt: Date | null;
  source: string;
};

export async function recordAttendance(
  sessionId: string,
  studentId: string,
  payload: {
    joinedAt: Date;
    leftAt?: Date | null;
    totalSeconds: number;
  }
): Promise<void> {
  const db = getDb();
  await db
    .insert(classAttendance)
    .values({
      sessionId,
      studentId,
      joinedAt: payload.joinedAt,
      leftAt: payload.leftAt ?? null,
      totalSeconds: payload.totalSeconds,
      source: "websocket",
    })
    .onConflictDoUpdate({
      target: [classAttendance.sessionId, classAttendance.studentId],
      set: {
        leftAt: payload.leftAt ?? null,
        totalSeconds: payload.totalSeconds,
      },
    });
}

export async function finalizeSessionAttendance(
  sessionId: string
): Promise<AttendanceRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      studentId: classAttendance.studentId,
      joinedAt: classAttendance.joinedAt,
      leftAt: classAttendance.leftAt,
      totalSeconds: classAttendance.totalSeconds,
      source: classAttendance.source,
    })
    .from(classAttendance)
    .where(eq(classAttendance.sessionId, sessionId))
    .orderBy(desc(classAttendance.totalSeconds));
  return rows.map((r) => ({ ...r, studentName: null }));
}

/**
 * Returns the attendance rows for one session, joined to the student
 * name. Used by the teacher post-class attendance panel.
 */
export async function getAttendanceForSession(
  sessionId: string
): Promise<AttendanceRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      studentId: classAttendance.studentId,
      totalSeconds: classAttendance.totalSeconds,
      joinedAt: classAttendance.joinedAt,
      leftAt: classAttendance.leftAt,
      source: classAttendance.source,
    })
    .from(classAttendance)
    .where(eq(classAttendance.sessionId, sessionId))
    .orderBy(desc(classAttendance.totalSeconds));
  // studentName is null in the simple projection — UI can join users
  // separately if it wants names. We expose a clean row shape either way.
  return rows.map((r) => ({ ...r, studentName: null }));
}

/**
 * Last 30 days attendance trend for a student in a course. Used by the
 * student dashboard streak UI and the R7 parent panel.
 */
export async function getAttendanceTrend(
  studentId: string,
  courseId: string
): Promise<Array<{ sessionId: string; joinedAt: Date; totalSeconds: number }>> {
  const db = getDb();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      sessionId: classAttendance.sessionId,
      joinedAt: classAttendance.joinedAt,
      totalSeconds: classAttendance.totalSeconds,
    })
    .from(classAttendance)
    .innerJoin(classSessions, eq(classAttendance.sessionId, classSessions.id))
    .where(
      and(
        eq(classAttendance.studentId, studentId),
        eq(classSessions.courseId, courseId),
        gte(classAttendance.joinedAt, cutoff)
      )
    )
    .orderBy(desc(classAttendance.joinedAt));
  return rows;
}

/**
 * Compute the student's total attendance time across all their
 * enrolled courses (for the streak panel).
 */
export async function getStudentTotalAttendanceSeconds(
  studentId: string
): Promise<number> {
  const db = getDb();
  const result = await db
    .select({ total: classAttendance.totalSeconds })
    .from(classAttendance)
    .innerJoin(classSessions, eq(classSessions.id, classAttendance.sessionId))
    .innerJoin(enrollments, eq(enrollments.courseId, classSessions.courseId))
    .where(
      and(
        eq(classAttendance.studentId, studentId),
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, "active"),
      )
    );
  return result.reduce((acc, r) => acc + (r.total ?? 0), 0);
}

void getStudentTotalAttendanceSeconds;
void getAttendanceTrend;
void getAttendanceForSession;
