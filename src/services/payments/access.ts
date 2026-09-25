/**
 * R6 — access gate.
 *
 * The single source of truth for "does this student have access to this
 * course". Replaces the old `payment_intents`-based gate. Logic:
 *
 *   1. If the course is free → enrollment.status === 'active'.
 *   2. If the course is paid standalone → an approved `payment_submissions`
 *      row exists for (user, course_id, scope_kind='course').
 *   3. If the course is part of a paid bundle → the user has an approved
 *      submission whose `payment_enrollments` row points at an enrollment
 *      for this course.
 *
 * `hasAccessToCourse` is the hot path used on every lesson view; it runs
 * three small indexed queries in parallel.
 */

import "server-only";
import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  courses,
  enrollments,
  paymentEnrollments,
  paymentSubmissions,
  type Course,
} from "@/db/schema";
import { isUuid } from "@/lib/utils";

export interface CourseAccessInput {
  userId: string;
  courseId: string;
}

export interface CourseAccessResult {
  hasAccess: boolean;
  /** 'free-enrollment' | 'paid-standalone' | 'paid-bundle' | 'none'. */
  source: "free-enrollment" | "paid-standalone" | "paid-bundle" | "none";
}

/**
 * Returns whether the student can see the course content. False negatives
 * are surfaced as 404 / NotFound at the call site — the spec explicitly
 * says payment / bundle access behaves like Not Found, not Forbidden.
 */
export async function hasAccessToCourse(
  userId: string,
  courseId: string
): Promise<CourseAccessResult> {
  if (!isUuid(courseId)) {
    return { hasAccess: false, source: "none" };
  }
  const db = getDb();

  const [course] = await db
    .select({
      id: courses.id,
      requiresPayment: courses.requiresPayment,
      priceBdt: courses.priceBdt,
    })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) return { hasAccess: false, source: "none" };

  // Free course → enrollment row check.
  if (!course.requiresPayment) {
    const [enrollment] = await db
      .select({ status: enrollments.status })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, userId),
          eq(enrollments.courseId, courseId),
          eq(enrollments.status, "active")
        )
      )
      .limit(1);
    return {
      hasAccess: Boolean(enrollment),
      source: enrollment ? "free-enrollment" : "none",
    };
  }

  // Paid standalone course.
  const [standalone] = await db
    .select({ id: paymentSubmissions.id })
    .from(paymentSubmissions)
    .where(
      and(
        eq(paymentSubmissions.userId, userId),
        eq(paymentSubmissions.scopeKind, "course"),
        eq(paymentSubmissions.scopeId, courseId),
        eq(paymentSubmissions.status, "approved")
      )
    )
    .limit(1);
  if (standalone) {
    return { hasAccess: true, source: "paid-standalone" };
  }

  // Paid bundle path.
  const [bundle] = await db
    .select({ id: paymentEnrollments.enrollmentId })
    .from(paymentEnrollments)
    .innerJoin(
      paymentSubmissions,
      and(
        eq(paymentSubmissions.id, paymentEnrollments.submissionId),
        eq(paymentSubmissions.status, "approved"),
        eq(paymentSubmissions.userId, userId)
      )
    )
    .innerJoin(
      enrollments,
      and(
        eq(enrollments.id, paymentEnrollments.enrollmentId),
        eq(enrollments.courseId, courseId)
      )
    )
    .limit(1);
  if (bundle) {
    return { hasAccess: true, source: "paid-bundle" };
  }

  return { hasAccess: false, source: "none" };
}

/**
 * Light projection used by the marketing / course detail page to render
 * the right CTA (Enroll free / Buy / Get bundle).
 */
export interface CourseAccessBadge {
  requiresPayment: boolean;
  priceBdt: number | null;
  /** True when the user already has access via any of the three paths. */
  hasAccess: boolean;
  source: CourseAccessResult["source"];
}

export async function getCourseAccessBadge(
  userId: string | null,
  course: Pick<Course, "id" | "requiresPayment" | "priceBdt">
): Promise<CourseAccessBadge> {
  const requiresPayment = Boolean(course.requiresPayment);
  const priceBdt = course.priceBdt ? Number(course.priceBdt) : null;

  if (!userId) {
    return { requiresPayment, priceBdt, hasAccess: false, source: "none" };
  }

  const access = await hasAccessToCourse(userId, course.id);
  return {
    requiresPayment,
    priceBdt,
    hasAccess: access.hasAccess,
    source: access.source,
  };
}

/**
 * Returns the approved submissions for a user across bundles and
 * standalone courses. Used by `/student/payments` to render the user's
 * payment history.
 */
export async function getApprovedSubmissionsForUser(userId: string): Promise<
  Array<{
    submissionId: string;
    scopeKind: "bundle" | "course";
    scopeId: string;
    amountBdt: number;
    reviewedAt: Date | null;
    receiptNumber: string | null;
  }>
> {
  const db = getDb();
  const rows = await db
    .select({
      id: paymentSubmissions.id,
      scopeKind: paymentSubmissions.scopeKind,
      scopeId: paymentSubmissions.scopeId,
      amountBdt: paymentSubmissions.amountBdt,
      reviewedAt: paymentSubmissions.reviewedAt,
    })
    .from(paymentSubmissions)
    .where(
      and(
        eq(paymentSubmissions.userId, userId),
        eq(paymentSubmissions.status, "approved")
      )
    );
  return rows.map((r) => ({
    submissionId: r.id,
    scopeKind: r.scopeKind as "bundle" | "course",
    scopeId: r.scopeId,
    amountBdt: Number(r.amountBdt),
    reviewedAt: r.reviewedAt,
    receiptNumber: null,
  }));
}

/**
 * Resolves all enrollments a student has access to via paid bundles.
 * Used by the teacher view ("my courses that have paid-enrolled students")
 * to compute cohort sizes.
 */
export async function listPaidEnrollmentIdsForUser(
  userId: string
): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ enrollmentId: paymentEnrollments.enrollmentId })
    .from(paymentEnrollments)
    .innerJoin(
      paymentSubmissions,
      and(
        eq(paymentSubmissions.id, paymentEnrollments.submissionId),
        eq(paymentSubmissions.status, "approved"),
        eq(paymentSubmissions.userId, userId)
      )
    );
  return rows.map((r) => r.enrollmentId);
}

/**
 * Has the user paid for this specific scope (bundle or course)?
 * Used by the checkout flow to disable the form after a recent submission.
 */
export async function hasRecentSubmissionForScope(input: {
  userId: string;
  scopeKind: "bundle" | "course";
  scopeId: string;
}): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: paymentSubmissions.id })
    .from(paymentSubmissions)
    .where(
      and(
        eq(paymentSubmissions.userId, input.userId),
        eq(paymentSubmissions.scopeKind, input.scopeKind),
        eq(paymentSubmissions.scopeId, input.scopeId),
        inArray(paymentSubmissions.status, [
          "submitted",
          "under_review",
          "approved",
        ])
      )
    )
    .limit(1);
  return Boolean(row);
}
