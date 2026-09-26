import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  qaThreads,
  lessons,
  courseModules,
  courses,
  type QaThread,
  type Role,
} from "@/db/schema";

/**
 * Moderation actions on Q&A threads. Every privileged write is gated
 * by an authoritative ownership check (lessons -> course_modules ->
 * courses.teacherId) or the caller's role.
 *
 * Soft-delete and lock are the two main flows in R4; admin bulk
 * operations live behind an explicit `isAdmin` flag.
 */

async function resolveContext(threadId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      lessonId: qaThreads.lessonId,
      courseId: courses.id,
      teacherId: courses.teacherId,
    })
    .from(qaThreads)
    .innerJoin(lessons, eq(lessons.id, qaThreads.lessonId))
    .innerJoin(courseModules, eq(courseModules.id, lessons.moduleId))
    .innerJoin(courses, eq(courses.id, courseModules.courseId))
    .where(eq(qaThreads.id, threadId))
    .limit(1);
  return row ?? null;
}

async function isTeacherOfCourse(
  userId: string,
  courseId: string
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, userId)))
    .limit(1);
  return Boolean(row);
}

function assertStaff(
  userRole: Role,
  ctx: { courseId: string } | null
): void {
  if (userRole === "admin") return;
  if (userRole === "teacher" && ctx) return;
  throw new Error("Only teachers and admins can take this action.");
}

export async function softDeleteThread(args: {
  threadId: string;
  userId: string;
  userRole: Role;
}): Promise<QaThread> {
  const db = getDb();
  const [thread] = await db
    .select({ id: qaThreads.id, userId: qaThreads.userId, deletedAt: qaThreads.deletedAt })
    .from(qaThreads)
    .where(eq(qaThreads.id, args.threadId))
    .limit(1);
  if (!thread) throw new Error("Thread not found.");

  const ctx = await resolveContext(args.threadId);
  if (!ctx) throw new Error("Thread not found.");

  // Authors can delete their own threads. Teachers can delete threads in
  // their course. Admins can delete anything.
  const isAuthor = thread.userId === args.userId;
  const isCourseTeacher =
    args.userRole === "teacher" &&
    (await isTeacherOfCourse(args.userId, ctx.courseId));
  const isAdmin = args.userRole === "admin";
  if (!isAuthor && !isCourseTeacher && !isAdmin) {
    throw new Error("You don't have permission to delete this thread.");
  }

  if (thread.deletedAt) return { ...thread, deletedAt: thread.deletedAt } as QaThread;

  const [updated] = await db
    .update(qaThreads)
    .set({
      deletedAt: sql`now()`,
      deletedBy: args.userId,
      updatedAt: sql`now()`,
    })
    .where(and(eq(qaThreads.id, args.threadId), sql`${qaThreads.deletedAt} IS NULL`))
    .returning();
  if (!updated) throw new Error("Thread not found.");
  return updated;
}

export async function lockThread(args: {
  threadId: string;
  userId: string;
  userRole: Role;
  locked: boolean;
}): Promise<QaThread> {
  const ctx = await resolveContext(args.threadId);
  if (!ctx) throw new Error("Thread not found.");
  assertStaff(args.userRole, ctx);

  if (args.userRole === "teacher") {
    const ok = await isTeacherOfCourse(args.userId, ctx.courseId);
    if (!ok) throw new Error("You don't own this course.");
  }

  const db = getDb();
  const [updated] = await db
    .update(qaThreads)
    .set({
      locked: args.locked,
      lockedAt: args.locked ? sql`now()` : null,
      lockedBy: args.locked ? args.userId : null,
      updatedAt: sql`now()`,
    })
    .where(eq(qaThreads.id, args.threadId))
    .returning();
  if (!updated) throw new Error("Thread not found.");
  return updated;
}

/**
 * Admin-only: permanently remove a thread and its replies. Bypasses the
 * soft-delete layer. Used by the admin user directory / moderation UI.
 */
export async function hardDeleteThread(args: {
  threadId: string;
  userRole: "admin" | "teacher" | "student";
}): Promise<void> {
  if (args.userRole !== "admin") {
    throw new Error("Hard-delete is restricted to admins.");
  }
  const db = getDb();
  // Cascading FKs on parent_id, accepted_answer_id and qa_votes handle
  // dependent rows.
  await db.delete(qaThreads).where(eq(qaThreads.id, args.threadId));
}
