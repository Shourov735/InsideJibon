import "server-only";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { isUuid } from "@/lib/utils";
import {
  courses,
  enrollments,
  users,
  type Course,
  type Enrollment,
} from "@/db/schema";

/**
 * Student enrollment service. Enrollment is only allowed for published
 * courses and is idempotent — the (studentId, courseId) unique constraint
 * is the final safety net against duplicate rows.
 */

export class CourseNotFoundError extends Error {
  constructor() {
    super("Course not found.");
  }
}

export class CourseNotPublishedError extends Error {
  constructor() {
    super("This course is not open for enrollment.");
  }
}

/**
 * Enrolls a student in a published course. Idempotent: enrolling twice
 * returns the existing enrollment with `alreadyEnrolled: true`.
 */
export async function enrollStudent(
  studentId: string,
  courseId: string
): Promise<{ enrollment: Enrollment; course: Pick<Course, "slug">; alreadyEnrolled: boolean }> {
  const db = getDb();

  if (!isUuid(courseId)) throw new CourseNotFoundError();

  const [course] = await db
    .select({ id: courses.id, slug: courses.slug, status: courses.status })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) throw new CourseNotFoundError();
  if (course.status !== "published") throw new CourseNotPublishedError();

  const [inserted] = await db
    .insert(enrollments)
    .values({ studentId, courseId })
    .onConflictDoNothing()
    .returning();

  if (inserted) {
    return {
      enrollment: inserted,
      course: { slug: course.slug },
      alreadyEnrolled: false,
    };
  }

  const existing = await getStudentEnrollment(studentId, courseId);
  if (!existing) {
    // Race condition between the conflict check and the read — retry once.
    const [retry] = await db
      .insert(enrollments)
      .values({ studentId, courseId })
      .onConflictDoNothing()
      .returning();
    if (!retry) throw new Error("Enrollment could not be completed. Please try again.");
    return { enrollment: retry, course: { slug: course.slug }, alreadyEnrolled: false };
  }

  return { enrollment: existing, course: { slug: course.slug }, alreadyEnrolled: true };
}

export async function isStudentEnrolled(
  studentId: string,
  courseId: string
): Promise<boolean> {
  return (await getStudentEnrollment(studentId, courseId)) !== null;
}

export async function getStudentEnrollment(
  studentId: string,
  courseId: string
): Promise<Enrollment | null> {
  const db = getDb();
  if (!isUuid(courseId)) return null;
  const [row] = await db
    .select()
    .from(enrollments)
    .where(
      and(eq(enrollments.studentId, studentId), eq(enrollments.courseId, courseId))
    )
    .limit(1);
  return row ?? null;
}

/**
 * All enrollments for a student (any course status), newest first.
 * Course-level filtering happens in the caller (e.g. dashboard shows only
 * published courses).
 */
export async function getStudentEnrollments(
  studentId: string
): Promise<Array<Enrollment & { course: Course; teacherName: string | null }>> {
  const db = getDb();
  const rows = await db
    .select({
      enrollment: enrollments,
      course: courses,
      teacherName: users.name,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(users, eq(users.id, courses.teacherId))
    .where(eq(enrollments.studentId, studentId))
    .orderBy(enrollments.enrolledAt);

  return rows.map(({ enrollment, course, teacherName }) => ({
    ...enrollment,
    course,
    teacherName,
  }));
}