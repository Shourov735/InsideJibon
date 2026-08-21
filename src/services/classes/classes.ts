import "server-only";
import { and, desc, eq, gte, asc } from "drizzle-orm";

import { getDb } from "@/db";
import {
  classSessions,
  courses,
  enrollments,
  type ClassSession,
} from "@/db/schema";
import { isUuid } from "@/lib/utils";
import type {
  CreateClassSessionInput,
  UpdateClassSessionInput,
} from "@/schemas/class-session";

export class ClassSessionNotFoundError extends Error {
  constructor() {
    super("Class session not found.");
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

/** Session → course → teacher. Returns null when the chain does not own it. */
export async function verifySessionOwnership(
  teacherId: string,
  sessionId: string
): Promise<{ session: ClassSession } | null> {
  if (!isUuid(sessionId)) return null;
  const db = getDb();
  const [row] = await db
    .select({ session: classSessions })
    .from(classSessions)
    .innerJoin(courses, eq(classSessions.courseId, courses.id))
    .where(and(eq(classSessions.id, sessionId), eq(courses.teacherId, teacherId)))
    .limit(1);

  return row ? { session: row.session } : null;
}

export async function createClassSession(
  teacherId: string,
  input: CreateClassSessionInput
): Promise<ClassSession> {
  const course = await verifyCourseOwnership(teacherId, input.courseId);
  if (!course) throw new ClassSessionNotFoundError();

  const db = getDb();
  const [session] = await db
    .insert(classSessions)
    .values({
      courseId: input.courseId,
      title: input.title.trim(),
      description: input.description?.trim(),
      sessionType: input.sessionType,
      externalUrl: input.externalUrl || null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      durationMinutes: input.durationMinutes,
      status: "upcoming",
    })
    .returning();

  return session;
}

export async function updateClassSession(
  teacherId: string,
  sessionId: string,
  input: UpdateClassSessionInput
): Promise<ClassSession> {
  const ownership = await verifySessionOwnership(teacherId, sessionId);
  if (!ownership) throw new ClassSessionNotFoundError();

  const db = getDb();
  const [updated] = await db
    .update(classSessions)
    .set({
      title: input.title.trim(),
      description: input.description?.trim(),
      sessionType: input.sessionType,
      externalUrl: input.externalUrl || null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      durationMinutes: input.durationMinutes,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(classSessions.id, sessionId))
    .returning();

  return updated;
}

export async function deleteClassSession(
  teacherId: string,
  sessionId: string
): Promise<void> {
  const ownership = await verifySessionOwnership(teacherId, sessionId);
  if (!ownership) throw new ClassSessionNotFoundError();

  const db = getDb();
  await db.delete(classSessions).where(eq(classSessions.id, sessionId));
}

export async function getTeacherSessionsForCourse(
  teacherId: string,
  courseId: string
): Promise<ClassSession[]> {
  const course = await verifyCourseOwnership(teacherId, courseId);
  if (!course) throw new ClassSessionNotFoundError();

  const db = getDb();
  return db
    .select()
    .from(classSessions)
    .where(eq(classSessions.courseId, courseId))
    .orderBy(desc(classSessions.scheduledAt));
}

export async function getStudentSessionsForCourse(
  studentId: string,
  courseId: string
): Promise<ClassSession[]> {
  const db = getDb();
  const rows = await db
    .select({ session: classSessions })
    .from(classSessions)
    .innerJoin(courses, eq(classSessions.courseId, courses.id))
    .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(classSessions.courseId, courseId),
        eq(courses.status, "published"),
        eq(enrollments.studentId, studentId)
      )
    )
    .orderBy(desc(classSessions.scheduledAt));

  return rows.map((r) => r.session);
}

export async function getUpcomingSessionsForStudent(
  studentId: string
): Promise<ClassSession[]> {
  const db = getDb();
  const now = new Date();
  
  const rows = await db
    .select({ session: classSessions })
    .from(classSessions)
    .innerJoin(courses, eq(classSessions.courseId, courses.id))
    .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(courses.status, "published"),
        eq(classSessions.status, "upcoming"),
        gte(classSessions.scheduledAt, now)
      )
    )
    .orderBy(asc(classSessions.scheduledAt));

  return rows.map((r) => r.session);
}

export async function markSessionCompleted(
  teacherId: string,
  sessionId: string
): Promise<ClassSession> {
  const ownership = await verifySessionOwnership(teacherId, sessionId);
  if (!ownership) throw new ClassSessionNotFoundError();

  const db = getDb();
  const [updated] = await db
    .update(classSessions)
    .set({
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(classSessions.id, sessionId))
    .returning();

  return updated;
}

export async function cancelSession(
  teacherId: string,
  sessionId: string
): Promise<ClassSession> {
  const ownership = await verifySessionOwnership(teacherId, sessionId);
  if (!ownership) throw new ClassSessionNotFoundError();

  const db = getDb();
  const [updated] = await db
    .update(classSessions)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(classSessions.id, sessionId))
    .returning();

  return updated;
}
