import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { isUuid } from "@/lib/utils";
import {
  courses,
  enrollments,
  users,
  type Course,
  type Enrollment,
} from "@/db/schema";
import { createNotification } from "@/services/notifications/notifications";

/**
 * Student enrollment service. Enrollment is a request/approval flow:
 * a student request starts as `pending`, and only `active` enrollments
 * grant course access. Teachers (course owners) and admins decide.
 * Idempotency relies on the (studentId, courseId) unique constraint;
 * decisions use atomic conditional UPDATEs (neon-http has no
 * transactions).
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

export class NotAuthorizedToDecideError extends Error {
  constructor() {
    super("You are not allowed to manage this enrollment request.");
  }
}

export class RequestNotFoundError extends Error {
  constructor() {
    super("Enrollment request not found.");
  }
}

export class RequestAlreadyDecidedError extends Error {
  constructor() {
    super("This request was already handled.");
  }
}

async function notifyCourseOwnerAndAdmins(
  course: Pick<Course, "id" | "slug" | "title" | "teacherId">,
  studentName: string,
  studentEmail: string
): Promise<void> {
  const db = getDb();
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));

  const recipients = new Set([course.teacherId]);
  for (const admin of admins) recipients.add(admin.id);

  const who = studentName || studentEmail;
  const title = "New enrollment request / নতুন এনরোলমেন্ট রিকোয়েস্ট";
  const body = `${who} requested access to "${course.title}".`;
  const link = `/courses/${course.slug}`;

  for (const recipientId of recipients) {
    try {
      await createNotification(recipientId, {
        type: "enrollment_request",
        title,
        body,
        link,
      });
    } catch (error) {
      console.error(`Failed to notify ${recipientId} of enrollment request`, error);
    }
  }
}

/**
 * Requests enrollment in a published course. Creates (or re-opens) a
 * `pending` request and notifies the course teacher plus all admins.
 */
export async function enrollStudent(
  studentId: string,
  courseId: string
): Promise<{
  enrollment: Enrollment;
  course: Pick<Course, "id" | "slug" | "title" | "teacherId">;
  alreadyRequested: boolean;
}> {
  const db = getDb();

  if (!isUuid(courseId)) throw new CourseNotFoundError();

  const [course] = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      status: courses.status,
      teacherId: courses.teacherId,
    })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) throw new CourseNotFoundError();
  if (course.status !== "published") throw new CourseNotPublishedError();

  const [student] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, studentId))
    .limit(1);

  const [inserted] = await db
    .insert(enrollments)
    .values({ studentId, courseId, status: "pending" })
    .onConflictDoNothing()
    .returning();

  if (!inserted) {
    // Row exists — check its state.
    const existing = await getStudentEnrollment(studentId, courseId);

    if (existing && existing.status === "active") {
      return { enrollment: existing, course, alreadyRequested: true };
    }

    if (existing && existing.status === "rejected") {
      // Re-request: atomically flip rejected -> pending. The conditional
      // WHERE guards against racing decisions.
      const [reopened] = await db
        .update(enrollments)
        .set({ status: "pending", decidedAt: null, decidedBy: null })
        .where(
          and(
            eq(enrollments.id, existing.id),
            eq(enrollments.status, "rejected")
          )
        )
        .returning();
      if (reopened) {
        if (student) {
          await notifyCourseOwnerAndAdmins(course, student.name ?? "", student.email);
        }
        return { enrollment: reopened, course, alreadyRequested: false };
      }
      throw new RequestAlreadyDecidedError();
    }

    if (existing && existing.status === "pending") {
      return { enrollment: existing, course, alreadyRequested: true };
    }

    // Race between conflict and read — retry once.
    const [retry] = await db
      .insert(enrollments)
      .values({ studentId, courseId, status: "pending" })
      .onConflictDoNothing()
      .returning();
    if (!retry) {
      throw new Error("Enrollment could not be completed. Please try again.");
    }

    if (student) {
      await notifyCourseOwnerAndAdmins(course, student.name ?? "", student.email);
    }
    return { enrollment: retry, course, alreadyRequested: false };
  }

  if (student) {
    await notifyCourseOwnerAndAdmins(course, student.name ?? "", student.email);
  }
  return { enrollment: inserted, course, alreadyRequested: false };
}

/**
 * Whether the student has an APPROVED enrollment — the authorization
 * check for all course-content access.
 */
export async function isStudentEnrolled(
  studentId: string,
  courseId: string
): Promise<boolean> {
  return (
    (await getStudentEnrollment(studentId, courseId))?.status === "active"
  );
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
    .orderBy(desc(enrollments.enrolledAt));

  return rows.map(({ enrollment, course, teacherName }) => ({
    ...enrollment,
    course,
    teacherName,
  }));
}

export interface PendingRequestRow {
  enrollment: Enrollment;
  studentName: string | null;
  studentEmail: string;
  courseTitle: string;
  courseSlug: string;
}

function mapRequestRows(rows: Array<{
  enrollment: Enrollment;
  studentName: string | null;
  studentEmail: string;
  courseTitle: string;
  courseSlug: string;
}>): PendingRequestRow[] {
  return rows;
}

/** Pending requests across the given courses (teacher view). */
export async function getPendingRequestsForCourses(
  courseIds: string[]
): Promise<PendingRequestRow[]> {
  if (courseIds.length === 0) return [];
  const db = getDb();
  const rows = await db
    .select({
      enrollment: enrollments,
      studentName: users.name,
      studentEmail: users.email,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.studentId, users.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(enrollments.status, "pending"),
        inArray(enrollments.courseId, courseIds)
      )
    )
    .orderBy(desc(enrollments.enrolledAt));
  return mapRequestRows(rows);
}

/** Pending requests for every course (admin view). */
export async function getAllPendingRequests(): Promise<PendingRequestRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      enrollment: enrollments,
      studentName: users.name,
      studentEmail: users.email,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.studentId, users.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.status, "pending"))
    .orderBy(desc(enrollments.enrolledAt));
  return mapRequestRows(rows);
}

/**
 * Approves or rejects a pending enrollment request. Atomic: only a still-
 * `pending` row can transition, so double-clicks and concurrent deciders
 * cannot double-apply. Teachers may only decide on their own courses.
 */
export async function decideEnrollment(params: {
  enrollmentId: string;
  decidedBy: string;
  decision: "approved" | "rejected";
  /** When set, the decider must own the course (teacher path). */
  requireCourseOwnershipOf?: string | null;
}): Promise<{ enrollment: Enrollment; courseSlug: string }> {
  const db = getDb();
  if (!isUuid(params.enrollmentId)) throw new RequestNotFoundError();

  const [row] = await db
    .select({
      enrollment: enrollments,
      courseSlug: courses.slug,
      courseTeacherId: courses.teacherId,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.id, params.enrollmentId))
    .limit(1);

  if (!row) throw new RequestNotFoundError();

  if (
    params.requireCourseOwnershipOf &&
    row.courseTeacherId !== params.requireCourseOwnershipOf
  ) {
    throw new NotAuthorizedToDecideError();
  }

  const nextStatus = params.decision === "approved" ? "active" : "rejected";
  const [updated] = await db
    .update(enrollments)
    .set({
      status: nextStatus,
      decidedAt: new Date(),
      decidedBy: params.decidedBy,
    })
    .where(
      and(
        eq(enrollments.id, params.enrollmentId),
        eq(enrollments.status, "pending")
      )
    )
    .returning();

  if (!updated) throw new RequestAlreadyDecidedError();

  const title =
    params.decision === "approved"
      ? "Enrollment approved / এনরোলমেন্ট অনুমোদিত"
      : "Enrollment request declined / এনরোলমেন্ট বাতিল";

  try {
    await createNotification(updated.studentId, {
      type: "enrollment_decision",
      title,
      body:
        params.decision === "approved"
          ? "Your enrollment request was approved. You now have full access to the course."
          : "Your enrollment request was declined by the instructor.",
      link: params.decision === "approved" ? `/courses/${row.courseSlug}` : "/courses",
    });
  } catch (error) {
    console.error("Failed to notify student of enrollment decision", error);
  }

  return { enrollment: updated, courseSlug: row.courseSlug };
}
