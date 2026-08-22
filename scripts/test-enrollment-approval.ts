import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";

try {
  process.loadEnvFile(".env.local");
} catch {}

import { courses, enrollments, notifications, users } from "../src/db/schema";
import * as enrollmentService from "../src/services/enrollments";

const db = drizzle(neon(process.env.DATABASE_URL!));

async function expectThrows(
  label: string,
  fn: () => Promise<unknown>,
  Err: new (...a: never[]) => Error
) {
  try {
    await fn();
  } catch (e) {
    if (e instanceof Err) return;
    throw new Error(`${label}: wrong error ${(e as Error).message}`);
  }
  throw new Error(`${label}: expected throw`);
}

(async () => {
  const adminId = "user_3IBPKNtXG2X5cu4ynrd8Te2J95e"; // mdshourov735 (admin)
  const teacherId = "user_3IAqSzddbIf4ZHBoEp62rFVxb50"; // smoke teacher (owns HSC courses)
  const studentAId = "user_3IAg6PZkpkX5isQ04OeQNrPAYT3"; // student-smoke
  const studentBId = "user_3IAhOMsIUDWdz7wNOtYVm9V48wq"; // student-smoke2

  // Clean slate for this test course pair
  await db.delete(enrollments).where(eq(enrollments.studentId, studentAId));
  await db.delete(enrollments).where(eq(enrollments.studentId, studentBId));
  await db.delete(notifications).where(eq(notifications.userId, teacherId));
  await db.delete(notifications).where(eq(notifications.userId, adminId));

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.slug, "hsc-physics-masterclass"))
    .limit(1);
  console.log("course:", course.slug);

  // ── 1. Request creates PENDING + notifies teacher & admins ────────────
  const req1 = await enrollmentService.enrollStudent(studentAId, course.id);
  if (req1.enrollment.status !== "pending") throw new Error("expected pending");
  if (req1.alreadyRequested) throw new Error("fresh request should not be alreadyRequested");
  console.log("✓ request created as pending");

  const teacherNotifs = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, teacherId), eq(notifications.type, "enrollment_request")));
  const adminNotifs = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, adminId), eq(notifications.type, "enrollment_request")));
  if (teacherNotifs.length !== 1 || adminNotifs.length !== 1)
    throw new Error(`expected notify teacher+admin, got ${teacherNotifs.length}/${adminNotifs.length}`);
  console.log("✓ teacher and admin both notified");

  // ── 2. Duplicate request is idempotent ────────────────────────────────
  const dup = await enrollmentService.enrollStudent(studentAId, course.id);
  if (!dup.alreadyRequested) throw new Error("dup should be alreadyRequested");
  console.log("✓ duplicate request idempotent");

  // ── 3. Pending grants NO access ───────────────────────────────────────
  const accessWhilePending = await enrollmentService.isStudentEnrolled(studentAId, course.id);
  if (accessWhilePending) throw new Error("pending must not grant access");
  console.log("✓ pending grants no access");

  // ── 4. Other-teacher cannot decide; student cannot decide ─────────────
  await expectThrows(
    "foreign teacher decision",
    () =>
      enrollmentService.decideEnrollment({
        enrollmentId: req1.enrollment.id,
        decidedBy: "user_3IACKLLp9aYRR4rwFbphbiAX0qJ", // test-user (student role but also non-owner)
        decision: "approved",
        requireCourseOwnershipOf: "user_3IACKLLp9aYRR4rwFbphbiAX0qJ",
      }),
    enrollmentService.NotAuthorizedToDecideError
  );
  console.log("✓ foreign ownership rejected");

  // ── 5. Owner approves → active + student notified + access granted ────
  const approved = await enrollmentService.decideEnrollment({
    enrollmentId: req1.enrollment.id,
    decidedBy: teacherId,
    decision: "approved",
    requireCourseOwnershipOf: teacherId,
  });
  if (approved.enrollment.status !== "active") throw new Error("expected active");
  const accessAfter = await enrollmentService.isStudentEnrolled(studentAId, course.id);
  if (!accessAfter) throw new Error("active must grant access");
  const studentNotifs = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, studentAId));
  if (!studentNotifs.some((n) => n.type === "enrollment_decision"))
    throw new Error("student was not notified of approval");
  console.log("✓ owner approve → active, access granted, student notified");

  // ── 6. Double-decide is blocked (atomic guard) ────────────────────────
  await expectThrows(
    "double decide",
    () =>
      enrollmentService.decideEnrollment({
        enrollmentId: req1.enrollment.id,
        decidedBy: adminId,
        decision: "rejected",
      }),
    enrollmentService.RequestAlreadyDecidedError
  );
  console.log("✓ double-decide blocked");

  // ── 7. Rejection flow: student B requests, admin rejects, re-request flips back to pending
  const reqB = await enrollmentService.enrollStudent(studentBId, course.id);
  const rejected = await enrollmentService.decideEnrollment({
    enrollmentId: reqB.enrollment.id,
    decidedBy: adminId,
    decision: "rejected",
  });
  if (rejected.enrollment.status !== "rejected") throw new Error("expected rejected");
  if (await enrollmentService.isStudentEnrolled(studentBId, course.id))
    throw new Error("rejected must not grant access");
  const again = await enrollmentService.enrollStudent(studentBId, course.id);
  if (again.enrollment.status !== "pending" || again.alreadyRequested)
    throw new Error("re-request should reopen as fresh pending");
  console.log("✓ reject → no access; re-request reopens as pending");

  // Cleanup test rows so production stays clean
  await db.delete(enrollments).where(eq(enrollments.studentId, studentAId));
  await db.delete(enrollments).where(eq(enrollments.studentId, studentBId));
  await db.delete(notifications).where(eq(notifications.userId, studentAId));
  await db.delete(notifications).where(eq(notifications.userId, studentBId));
  await db.delete(notifications).where(eq(notifications.userId, teacherId));
  await db.delete(notifications).where(eq(notifications.userId, adminId));
  console.log("\nALL ENROLLMENT APPROVAL TESTS PASSED (cleaned up)");
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
