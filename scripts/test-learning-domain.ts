import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { and, count, eq, inArray } from "drizzle-orm";

// Load environment
try {
  process.loadEnvFile(".env.local");
} catch {
  // ok
}

import { courses, enrollments, lessonProgress, users } from "../src/db/schema";
import * as courseService from "../src/services/courses";
import * as enrollmentService from "../src/services/enrollments";
import * as learningService from "../src/services/learning";
import {
  enrollCourseSchema,
  lessonPositionActionSchema,
  lessonProgressActionSchema,
} from "../src/schemas/learning";

const db = drizzle(neon(process.env.DATABASE_URL!));

async function expectThrows(
  label: string,
  fn: () => Promise<unknown>,
  errorType?: new (...args: never[]) => Error
): Promise<void> {
  let caught: unknown = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  if (!caught) {
    throw new Error(`SECURITY/EXPECTATION FAILURE: "${label}" did not throw!`);
  }
  if (errorType && !(caught instanceof errorType)) {
    throw new Error(
      `"${label}" threw the wrong error type: ${(caught as Error).constructor.name}`
    );
  }
}

async function runTests() {
  console.log("=== STARTING INSIDEJIBON LEARNING DOMAIN & SECURITY TESTS ===\n");

  const suffix = Date.now();
  const teacherAId = `test_lrn_ta_${suffix}`;
  const teacherBId = `test_lrn_tb_${suffix}`;
  const studentAId = `test_lrn_sa_${suffix}`;
  const studentBId = `test_lrn_sb_${suffix}`;
  const studentCId = `test_lrn_sc_${suffix}`;

  const courseIds: string[] = [];
  const userIds = [teacherAId, teacherBId, studentAId, studentBId, studentCId];

  try {
    // ── Setup ──────────────────────────────────────────────────────────────
    console.log("1. Setting up test users (teachers + students)...");
    await db.insert(users).values([
      { id: teacherAId, email: `lrn_ta_${suffix}@test.com`, name: "Teacher A", role: "teacher" },
      { id: teacherBId, email: `lrn_tb_${suffix}@test.com`, name: "Teacher B", role: "teacher" },
      { id: studentAId, email: `lrn_sa_${suffix}@test.com`, name: "Student A", role: "student" },
      { id: studentBId, email: `lrn_sb_${suffix}@test.com`, name: "Student B", role: "student" },
      { id: studentCId, email: `lrn_sc_${suffix}@test.com`, name: "Student C", role: "student" },
    ]);
    console.log("✓ Test users created.");

    // Published course with 2 modules / 3 lessons (course A)
    const courseA = await courseService.createCourse(teacherAId, {
      title: "Learning Domain Physics",
      description: "A published course used for learning domain tests.",
    });
    courseIds.push(courseA.id);
    const mod1 = await courseService.createModule(teacherAId, {
      courseId: courseA.id,
      title: "Mechanics",
    });
    const mod2 = await courseService.createModule(teacherAId, {
      courseId: courseA.id,
      title: "Waves",
    });
    const les1 = await courseService.createLesson(teacherAId, {
      moduleId: mod1.id,
      title: "Vectors",
      content: "Vector algebra fundamentals.",
    });
    const les2 = await courseService.createLesson(teacherAId, {
      moduleId: mod1.id,
      title: "Kinematics",
      content: "Equations of motion.",
    });
    const les3 = await courseService.createLesson(teacherAId, {
      moduleId: mod2.id,
      title: "Wave Equation",
      content: "Wave mathematics.",
    });
    await courseService.publishCourse(teacherAId, courseA.id);

    // Draft course
    const courseDraft = await courseService.createCourse(teacherAId, {
      title: "Secret Draft Course",
      description: "This course must never be enrollable.",
    });
    courseIds.push(courseDraft.id);

    // Archived course
    const courseArchived = await courseService.createCourse(teacherAId, {
      title: "Archived Course",
      description: "This course must never be enrollable.",
    });
    courseIds.push(courseArchived.id);
    await courseService.archiveCourse(teacherAId, courseArchived.id);

    // Teacher B's published course (unrelated to student A)
    const courseB = await courseService.createCourse(teacherBId, {
      title: "Teacher B Course",
      description: "A course owned by a different teacher.",
    });
    courseIds.push(courseB.id);
    const modB = await courseService.createModule(teacherBId, {
      courseId: courseB.id,
      title: "Module B",
    });
    const lesB = await courseService.createLesson(teacherBId, {
      moduleId: modB.id,
      title: "Lesson B",
    });
    await courseService.publishCourse(teacherBId, courseB.id);

    // Zero-lesson course forced to published (bypasses publish validation)
    const courseEmpty = await courseService.createCourse(teacherAId, {
      title: "Empty Course",
      description: "Published with no lessons for division-by-zero safety.",
    });
    courseIds.push(courseEmpty.id);
    await db
      .update(courses)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(courses.id, courseEmpty.id));
    console.log("✓ Setup complete: 1 published, 1 draft, 1 archived, 1 foreign, 1 empty course.");

    // ── 1. Enrollment in published course ──────────────────────────────────
    console.log("\n2. Enrolling Student A in published course...");
    const enrollRes = await enrollmentService.enrollStudent(studentAId, courseA.id);
    if (enrollRes.alreadyEnrolled) throw new Error("Fresh enrollment should not be 'already enrolled'");
    console.log(`✓ Student A enrolled: ${enrollRes.enrollment.id}`);

    // ── 2. Enrollment in draft course → BLOCKED ────────────────────────────
    console.log("\n3. Enrolling in a DRAFT course...");
    await expectThrows(
      "draft enrollment",
      () => enrollmentService.enrollStudent(studentAId, courseDraft.id),
      enrollmentService.CourseNotPublishedError
    );
    console.log("✓ Draft enrollment blocked.");

    // ── 3. Enrollment in archived course → BLOCKED ─────────────────────────
    console.log("\n4. Enrolling in an ARCHIVED course...");
    await expectThrows(
      "archived enrollment",
      () => enrollmentService.enrollStudent(studentAId, courseArchived.id),
      enrollmentService.CourseNotPublishedError
    );
    console.log("✓ Archived enrollment blocked.");

    // ── 4. Duplicate enrollment → idempotent, no duplicate row ─────────────
    console.log("\n5. Duplicate enrollment...");
    const dupRes = await enrollmentService.enrollStudent(studentAId, courseA.id);
    if (!dupRes.alreadyEnrolled) throw new Error("Second enrollment should report alreadyEnrolled");
    if (dupRes.enrollment.id !== enrollRes.enrollment.id) {
      throw new Error("Duplicate enrollment created a different row!");
    }
    const [dupCount] = await db
      .select({ value: count() })
      .from(enrollments)
      .where(
        and(eq(enrollments.studentId, studentAId), eq(enrollments.courseId, courseA.id))
      );
    if ((dupCount?.value ?? 0) !== 1) {
      throw new Error(`Expected exactly 1 enrollment row, got ${dupCount?.value}`);
    }
    // Unique constraint as the final safety net
    await expectThrows("raw duplicate insert", async () => {
      await db.insert(enrollments).values({ studentId: studentAId, courseId: courseA.id });
    });
    console.log("✓ Duplicate enrollment is idempotent and the unique constraint holds.");

    // ── 5. Student A cannot access Student B's enrollment ──────────────────
    console.log("\n6. Cross-user enrollment isolation...");
    await enrollmentService.enrollStudent(studentBId, courseA.id);
    const aEnrollments = await enrollmentService.getStudentEnrollments(studentAId);
    if (aEnrollments.some((e) => e.studentId === studentBId)) {
      throw new Error("Student A sees Student B's enrollment!");
    }
    if (!aEnrollments.some((e) => e.courseId === courseA.id && e.studentId === studentAId)) {
      throw new Error("Student A should see their own enrollment");
    }
    const bSeesA = await enrollmentService.getStudentEnrollment(studentBId, courseA.id);
    if (!bSeesA || bSeesA.studentId !== studentBId) {
      throw new Error("Student B's own enrollment must have studentId = B");
    }
    console.log("✓ Cross-user enrollment isolation verified.");

    // ── 6. Enrolled student can access learning workspace ──────────────────
    console.log("\n7. Learning workspace access (enrolled student)...");
    const workspace = await learningService.getLearningCourse(studentAId, courseA.id);
    if (!workspace) throw new Error("Enrolled student should access the workspace");
    const lessonCount = workspace.modules.reduce((acc, m) => acc + m.lessons.length, 0);
    if (lessonCount !== 3) throw new Error(`Expected 3 lessons, got ${lessonCount}`);
    if (workspace.progress.completed !== 0 || workspace.progress.percent !== 0) {
      throw new Error("Fresh workspace should show 0% progress");
    }
    console.log(`✓ Workspace accessible with ${lessonCount} lessons, 0% progress.`);

    // ── 7. Non-enrolled student cannot access learning workspace ───────────
    console.log("\n8. Learning workspace access (non-enrolled student)...");
    const deniedWorkspace = await learningService.getLearningCourse(studentCId, courseA.id);
    if (deniedWorkspace !== null) {
      throw new Error("Non-enrolled student must not access the workspace!");
    }
    console.log("✓ Non-enrolled student denied (null, no info leak).");

    // ── 8. Draft course learning → DENIED ──────────────────────────────────
    console.log("\n9. Draft course learning access...");
    const draftWorkspace = await learningService.getLearningCourse(studentAId, courseDraft.id);
    if (draftWorkspace !== null) throw new Error("Draft course workspace must be denied!");
    console.log("✓ Draft course learning denied.");

    // ── 9. Archived course learning → DENIED ───────────────────────────────
    console.log("\n10. Archived course learning access...");
    const archivedWorkspace = await learningService.getLearningCourse(studentAId, courseArchived.id);
    if (archivedWorkspace !== null) throw new Error("Archived course workspace must be denied!");
    console.log("✓ Archived course learning denied.");

    // ── 10. Student A cannot modify Student B's progress ───────────────────
    console.log("\n11. Cross-user progress isolation...");
    await learningService.markLessonCompleted(studentBId, les1.id);
    const aLesson1 = await learningService.getLessonForStudent(studentAId, les1.id);
    if (aLesson1?.progress?.completed) {
      throw new Error("Student A's lesson appears completed by Student B's action!");
    }
    await learningService.markLessonCompleted(studentAId, les2.id);
    const bLesson2 = await learningService.getLessonForStudent(studentBId, les2.id);
    if (bLesson2?.progress?.completed) {
      throw new Error("Student B's lesson appears completed by Student A's action!");
    }
    console.log("✓ Cross-user progress isolation verified.");

    // ── 11. Lesson from unrelated course cannot be completed ───────────────
    console.log("\n12. Completing a lesson from an unrelated course...");
    await expectThrows(
      "cross-course lesson completion",
      () => learningService.markLessonCompleted(studentAId, lesB.id),
      learningService.LessonAccessDeniedError
    );
    const foreignLesson = await learningService.getLessonForStudent(studentAId, lesB.id);
    if (foreignLesson !== null) throw new Error("Foreign lesson must not be readable!");
    console.log("✓ Cross-course lesson completion blocked.");

    // ── 12. Lesson completion creates progress ─────────────────────────────
    console.log("\n13. Lesson completion creates progress...");
    await learningService.markLessonCompleted(studentAId, les1.id);
    const aAfter = await learningService.getLessonForStudent(studentAId, les1.id);
    if (!aAfter?.progress?.completed) throw new Error("Lesson should be completed");
    if (!aAfter.progress.completedAt) throw new Error("completedAt must be set");
    console.log("✓ Completion recorded with completedAt.");

    // ── 13. Repeated completion is idempotent ──────────────────────────────
    console.log("\n14. Repeated completion idempotency...");
    const completedAtBefore = aAfter.progress.completedAt.getTime();
    await learningService.markLessonCompleted(studentAId, les1.id);
    const [progressRows] = await db
      .select({ value: count() })
      .from(lessonProgress)
      .where(
        and(eq(lessonProgress.studentId, studentAId), eq(lessonProgress.lessonId, les1.id))
      );
    if ((progressRows?.value ?? 0) !== 1) {
      throw new Error(`Expected 1 progress row, got ${progressRows?.value}`);
    }
    const aAfterRepeat = await learningService.getLessonForStudent(studentAId, les1.id);
    if (aAfterRepeat?.progress?.completedAt?.getTime() !== completedAtBefore) {
      throw new Error("Repeated completion changed completedAt (should be idempotent)");
    }
    console.log("✓ Repeated completion is idempotent.");

    // ── 14. Course progress calculation ────────────────────────────────────
    console.log("\n15. Course progress calculation...");
    await learningService.markLessonCompleted(studentAId, les2.id);
    await learningService.markLessonCompleted(studentAId, les3.id);
    const progressFull = await learningService.getCourseProgress(studentAId, courseA.id);
    if (!progressFull || progressFull.completed !== 3 || progressFull.total !== 3 || progressFull.percent !== 100) {
      throw new Error(`Unexpected full progress: ${JSON.stringify(progressFull)}`);
    }
    const enrollmentAfter = await enrollmentService.getStudentEnrollment(studentAId, courseA.id);
    if (!enrollmentAfter?.completedAt) throw new Error("Enrollment completedAt should be set at 100%");
    console.log("✓ 3/3 = 100% and enrollment completedAt set.");

    // Uncomplete a lesson → progress drops and completedAt clears
    await learningService.unmarkLessonCompleted(studentAId, les3.id);
    const progressPartial = await learningService.getCourseProgress(studentAId, courseA.id);
    if (!progressPartial || progressPartial.completed !== 2 || progressPartial.total !== 3 || progressPartial.percent !== 67) {
      throw new Error(`Unexpected partial progress: ${JSON.stringify(progressPartial)}`);
    }
    const enrollmentAfterUnmark = await enrollmentService.getStudentEnrollment(studentAId, courseA.id);
    if (enrollmentAfterUnmark?.completedAt !== null) {
      throw new Error("Enrollment completedAt should clear when progress drops below 100%");
    }
    const uncompleted = await learningService.getLessonForStudent(studentAId, les3.id);
    if (uncompleted?.progress?.completed) throw new Error("Uncompleted lesson should read as incomplete");
    if (uncompleted?.progress?.completedAt !== null && uncompleted?.progress?.completedAt !== undefined) {
      throw new Error("completedAt should be null after uncomplete");
    }
    console.log("✓ 2/3 = 67% after uncomplete, completedAt cleared.");

    // ── 15. Zero-lesson course does not divide by zero ─────────────────────
    console.log("\n16. Zero-lesson course safety...");
    await enrollmentService.enrollStudent(studentAId, courseEmpty.id);
    const emptyProgress = await learningService.getCourseProgress(studentAId, courseEmpty.id);
    if (!emptyProgress || emptyProgress.completed !== 0 || emptyProgress.total !== 0 || emptyProgress.percent !== 0) {
      throw new Error(`Zero-lesson course must yield 0/0/0: ${JSON.stringify(emptyProgress)}`);
    }
    const emptyWorkspace = await learningService.getLearningCourse(studentAId, courseEmpty.id);
    if (!emptyWorkspace || emptyWorkspace.modules.length !== 0 || emptyWorkspace.progress.percent !== 0) {
      throw new Error("Zero-lesson workspace must be safe");
    }
    console.log("✓ Zero-lesson course yields 0% without dividing by zero.");

    // ── 16. Previous/next respects module ordering ─────────────────────────
    console.log("\n17. Previous/next lesson navigation...");
    const nav1 = await learningService.getLessonForStudent(studentAId, les1.id);
    const nav2 = await learningService.getLessonForStudent(studentAId, les2.id);
    const nav3 = await learningService.getLessonForStudent(studentAId, les3.id);
    if (!nav1 || !nav2 || !nav3) throw new Error("Navigation lessons missing");
    if (nav1.prevLessonId !== null || nav1.nextLessonId !== les2.id) {
      throw new Error(`les1 nav wrong: prev=${nav1.prevLessonId} next=${nav1.nextLessonId}`);
    }
    if (nav2.prevLessonId !== les1.id || nav2.nextLessonId !== les3.id) {
      throw new Error(`les2 nav wrong: prev=${nav2.prevLessonId} next=${nav2.nextLessonId}`);
    }
    if (nav3.prevLessonId !== les2.id || nav3.nextLessonId !== null) {
      throw new Error(`les3 nav wrong: prev=${nav3.prevLessonId} next=${nav3.nextLessonId}`);
    }
    console.log("✓ Module-spanning prev/next ordering correct (1.1 → 1.2 → 2.1).");

    // ── 17. Unauthorized / unknown student requests are rejected ───────────
    console.log("\n18. Unknown-student requests rejected...");
    const ghostId = "ghost_student_not_in_db";
    if (await learningService.getLearningCourse(ghostId, courseA.id)) {
      throw new Error("Ghost student must not access the workspace");
    }
    if (await learningService.getLessonForStudent(ghostId, les1.id)) {
      throw new Error("Ghost student must not read lessons");
    }
    await expectThrows(
      "ghost student completes lesson",
      () => learningService.markLessonCompleted(ghostId, les1.id),
      learningService.LessonAccessDeniedError
    );
    console.log("✓ Unknown student requests rejected without leaking existence.");

    // ── 18. Invalid IDs are rejected safely ────────────────────────────────
    console.log("\n19. Invalid IDs rejected...");
    if (enrollCourseSchema.safeParse({ courseId: "not-a-uuid" }).success) {
      throw new Error("Enroll schema must reject non-uuid courseId");
    }
    if (lessonProgressActionSchema.safeParse({ lessonId: "not-a-uuid", completed: true }).success) {
      throw new Error("Progress schema must reject non-uuid lessonId");
    }
    if (lessonPositionActionSchema.safeParse({ lessonId: "not-a-uuid", position: -5 }).success) {
      throw new Error("Position schema must reject negative positions");
    }
    if (lessonPositionActionSchema.safeParse({ lessonId: "not-a-uuid", position: 10 }).success) {
      throw new Error("Position schema must reject non-uuid lessonId");
    }
    await expectThrows(
      "enroll with garbage id",
      () => enrollmentService.enrollStudent(studentAId, "not-a-uuid"),
      enrollmentService.CourseNotFoundError
    );
    if (await learningService.getLearningCourse(studentAId, "not-a-uuid")) {
      throw new Error("Garbage courseId must not resolve");
    }
    if (await learningService.getLessonForStudent(studentAId, "not-a-uuid")) {
      throw new Error("Garbage lessonId must not resolve");
    }
    await expectThrows(
      "complete with garbage id",
      () => learningService.markLessonCompleted(studentAId, "not-a-uuid"),
      learningService.LessonAccessDeniedError
    );
    console.log("✓ Invalid IDs rejected at schema and service boundaries.");

    // ── 19. Archived AFTER enrollment → learning revoked ───────────────────
    console.log("\n20. Course archived after enrollment revokes learning...");
    await courseService.archiveCourse(teacherAId, courseA.id);
    const revoked = await learningService.getLearningCourse(studentAId, courseA.id);
    if (revoked !== null) throw new Error("Archived course must revoke learning workspace!");
    console.log("✓ Archived course revokes learning access.");

    // ── 20. Dashboard shows only published enrollments ─────────────────────
    console.log("\n21. Student dashboard summary...");
    const dashboard = await learningService.getStudentDashboard(studentAId);
    if (dashboard.some((c) => c.courseId === courseA.id)) {
      throw new Error("Archived course must not appear in dashboard");
    }
    if (!dashboard.some((c) => c.courseId === courseEmpty.id)) {
      throw new Error("Published empty course should appear in dashboard");
    }
    const emptyCard = dashboard.find((c) => c.courseId === courseEmpty.id);
    if (!emptyCard || emptyCard.progress.percent !== 0 || emptyCard.lastLesson !== null) {
      throw new Error("Empty course card should show 0% and no resume point");
    }
    console.log("✓ Dashboard filtered to published enrollments with safe progress.");

    console.log("\n============================================================");
    console.log("🎉 ALL LEARNING DOMAIN & SECURITY TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("============================================================\n");
  } catch (err) {
    console.error("TEST FAILED WITH ERROR:", err);
    process.exitCode = 1;
  } finally {
    // Cleanup: delete courses (cascades modules/lessons/progress/enrollments)
    try {
      if (courseIds.length) {
        await db.delete(courses).where(inArray(courses.id, courseIds));
      }
      await db.delete(users).where(inArray(users.id, userIds));
      console.log("✓ Test cleanup completed.");
    } catch (cleanupError) {
      console.warn("Cleanup issue:", cleanupError);
    }
    if (process.exitCode) process.exit(1);
  }
}

runTests();