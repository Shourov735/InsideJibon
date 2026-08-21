import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, inArray } from "drizzle-orm";

// Load environment
try {
  process.loadEnvFile(".env.local");
} catch {
  // ok
}

import {
  assignmentSubmissionFiles,
  assignmentSubmissions,
  assignments,
  courses,
  users,
} from "../src/db/schema";
import * as courseService from "../src/services/courses";
import * as enrollmentService from "../src/services/enrollments";
import * as assignmentService from "../src/services/assignments";
import {
  buildAssignmentStorageKey,
} from "../src/schemas/assignment";
import {
  AssignmentAlreadyGradedError,
  AssignmentCannotDeleteError,
  AssignmentClosedError,
  AssignmentNotEditableError,
  AssignmentNotFoundError,
  AssignmentPublishBlockedError,
  LateSubmissionNotAllowedError,
  SubmissionNotFoundError,
} from "../src/services/assignments/access";
import {
  FileTooLargeError,
  InvalidFileError,
  UnsupportedFileTypeError,
  UploadFailedError,
} from "../src/services/assignments/submissions";
import {
  InvalidGradeError,
  SubmissionNotGradeableError,
} from "../src/services/assignments/grading";
import { MemoryStorage } from "../src/lib/storage";

const db = drizzle(neon(process.env.DATABASE_URL!));

class FailingPutStorage extends MemoryStorage {
  override async putObject(): Promise<void> {
    throw new Error("simulated R2 outage");
  }
}

function makeFile(
  name: string,
  type: string,
  size = 1024
): assignmentService.UploadableSubmissionFile {
  return {
    name,
    type,
    size,
    async arrayBuffer() {
      return new ArrayBuffer(size);
    },
  };
}

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
  console.log("=== STARTING INSIDEJIBON ASSIGNMENTS DOMAIN & SECURITY TESTS ===\n");

  const suffix = Date.now();
  const teacherAId = `test_asg_ta_${suffix}`;
  const teacherBId = `test_asg_tb_${suffix}`;
  const studentAId = `test_asg_sa_${suffix}`;
  const studentBId = `test_asg_sb_${suffix}`;
  const userIds = [teacherAId, teacherBId, studentAId, studentBId];
  const courseIds: string[] = [];

  try {
    // ── Setup ──────────────────────────────────────────────────────────────
    console.log("1. Setting up test users, courses and enrollment...");
    await db.insert(users).values([
      { id: teacherAId, email: `asg_ta_${suffix}@test.com`, name: "Teacher A", role: "teacher" },
      { id: teacherBId, email: `asg_tb_${suffix}@test.com`, name: "Teacher B", role: "teacher" },
      { id: studentAId, email: `asg_sa_${suffix}@test.com`, name: "Student A", role: "student" },
      { id: studentBId, email: `asg_sb_${suffix}@test.com`, name: "Student B", role: "student" },
    ]);

    const courseA = await courseService.createCourse(teacherAId, {
      title: "Assignments Course",
      description: "Course for assignment/submission tests.",
    });
    courseIds.push(courseA.id);
    const moduleA = await courseService.createModule(teacherAId, {
      courseId: courseA.id,
      title: "Core",
    });
    await courseService.createLesson(teacherAId, {
      moduleId: moduleA.id,
      title: "Lesson One",
    });
    await courseService.publishCourse(teacherAId, courseA.id);

    const courseB = await courseService.createCourse(teacherBId, {
      title: "Teacher B Course",
      description: "Unrelated course owned by Teacher B.",
    });
    courseIds.push(courseB.id);
    const moduleB = await courseService.createModule(teacherBId, {
      courseId: courseB.id,
      title: "Module B",
    });
    await courseService.createLesson(teacherBId, {
      moduleId: moduleB.id,
      title: "Lesson B",
    });
    await courseService.publishCourse(teacherBId, courseB.id);

    await enrollmentService.enrollStudent(studentAId, courseA.id);
    console.log("✓ Setup complete.");

    const storage = new MemoryStorage();
    const futureDue = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    // ── 1. Teacher creates a draft assignment ─────────────────────────────
    console.log("\n2. Teacher A creates a draft assignment...");
    const asg1 = await assignmentService.createAssignment(teacherAId, {
      courseId: courseA.id,
      title: "Essay One",
      instructions: "Write a comprehensive essay about testing.",
      dueAt: futureDue,
      maxPoints: 50,
      allowLateSubmission: false,
      allowedFileTypes: ["application/pdf"],
      maxFileSize: 1024 * 1024,
    });
    if (asg1.status !== "draft") throw new Error("New assignment must be draft");
    if (asg1.maxPoints !== 50) throw new Error("maxPoints mismatch");
    console.log(`✓ Created draft assignment ${asg1.id}.`);

    // ── 2. Cross-teacher access behaves like Not Found ────────────────────
    console.log("\n3. Cross-teacher isolation...");
    if ((await assignmentService.getTeacherAssignmentById(teacherBId, asg1.id)) !== null) {
      throw new Error("Teacher B must NOT see Teacher A's assignment");
    }
    await expectThrows(
      "cross-teacher update",
      () =>
        assignmentService.updateAssignment(teacherBId, asg1.id, {
          assignmentId: asg1.id,
          courseId: courseA.id,
          title: "Hijacked Title",
          instructions: "Should never be written to the database.",
          maxPoints: 10,
          allowLateSubmission: true,
          allowedFileTypes: [],
          maxFileSize: 1024,
        }),
      AssignmentNotFoundError
    );
    await expectThrows(
      "cross-teacher publish",
      () => assignmentService.publishAssignment(teacherBId, asg1.id),
      AssignmentNotFoundError
    );
    await expectThrows(
      "cross-teacher delete",
      () => assignmentService.deleteAssignment(teacherBId, asg1.id),
      AssignmentNotFoundError
    );
    await expectThrows(
      "cross-course creation",
      () =>
        assignmentService.createAssignment(teacherBId, {
          courseId: courseA.id,
          title: "Foreign Assignment",
          instructions: "Teacher B creating inside Teacher A's course.",
          maxPoints: 10,
          allowLateSubmission: false,
          allowedFileTypes: [],
          maxFileSize: 1024,
        }),
      AssignmentNotFoundError
    );
    console.log("✓ All cross-teacher operations behave like Not Found.");

    // ── 3. Publishing preconditions are enforced authoritatively ──────────
    console.log("\n4. Publish preconditions...");
    const pastDueAsg = await assignmentService.createAssignment(teacherAId, {
      courseId: courseA.id,
      title: "Past Due Assignment",
      instructions: "This assignment has a due date in the past.",
      dueAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      maxPoints: 20,
      allowLateSubmission: false,
      allowedFileTypes: [],
      maxFileSize: 1024,
    });
    const validation = await assignmentService.validateAssignmentForPublishing(
      teacherAId,
      pastDueAsg.id
    );
    if (validation.canPublish) throw new Error("Past-due assignment must not be publishable");
    if (!validation.errors.some((e) => e.toLowerCase().includes("due"))) {
      throw new Error(`Expected a due-date error, got: ${JSON.stringify(validation.errors)}`);
    }
    await expectThrows(
      "publish blocked assignment",
      () => assignmentService.publishAssignment(teacherAId, pastDueAsg.id),
      AssignmentPublishBlockedError
    );
    console.log("✓ Past-due assignment cannot be published.");

    // ── 4. Publish → student visibility follows lifecycle ─────────────────
    console.log("\n5. Publish lifecycle and student visibility...");
    // Not enrolled / unpublished checks first
    if (
      (await assignmentService.getStudentCourseAssignmentsWithStatus(studentAId, courseA.id)) === null
    ) {
      throw new Error("Enrolled student must see the course assignment list");
    }

    const published1 = await assignmentService.publishAssignment(teacherAId, asg1.id);
    if (published1.status !== "published") throw new Error("Publish failed");
    if (!published1.publishedAt) throw new Error("publishedAt missing");

    const studentViewA = await assignmentService.getStudentCourseAssignmentsWithStatus(
      studentAId,
      courseA.id
    );
    if (!studentViewA || studentViewA.length !== 1) {
      throw new Error("Enrolled student should see exactly one published assignment");
    }
    const studentViewB = await assignmentService.getStudentCourseAssignmentsWithStatus(
      studentBId,
      courseA.id
    );
    if (studentViewB !== null) {
      throw new Error("Un-enrolled student must get null (behaves like Not Found)");
    }
    console.log("✓ Published assignment visible to enrolled student only.");

    // ── 5. Draft-only structural editing ──────────────────────────────────
    console.log("\n6. Structural edit protections...");
    await expectThrows(
      "edit published assignment",
      () =>
        assignmentService.updateAssignment(teacherAId, asg1.id, {
          assignmentId: asg1.id,
          courseId: courseA.id,
          title: "Edited While Published",
          instructions: "Published assignments are frozen and must reject edits.",
          maxPoints: 30,
          allowLateSubmission: false,
          allowedFileTypes: [],
          maxFileSize: 2048,
        }),
      AssignmentNotEditableError
    );
    await expectThrows(
      "delete published assignment",
      () => assignmentService.deleteAssignment(teacherAId, asg1.id),
      AssignmentCannotDeleteError
    );

    // Unpublish → editable again → republish
    const unpublished = await assignmentService.unpublishAssignment(teacherAId, asg1.id);
    if (unpublished.status !== "draft") throw new Error("Unpublish failed");
    const edited = await assignmentService.updateAssignment(teacherAId, asg1.id, {
      assignmentId: asg1.id,
      courseId: courseA.id,
      title: "Essay One (Revised)",
      instructions: "Write a comprehensive essay about testing, revised.",
      dueAt: futureDue,
      maxPoints: 60,
      allowLateSubmission: true,
      allowedFileTypes: ["application/pdf", "text/plain"],
      maxFileSize: 2 * 1024 * 1024,
    });
    if (edited.maxPoints !== 60) throw new Error("Draft edit did not apply");
    if (edited.courseId !== courseA.id) throw new Error("Course binding changed illegally");
    await assignmentService.publishAssignment(teacherAId, asg1.id);
    console.log("✓ Edits blocked while published, allowed in draft; republished.");

    // ── 6. Submission lifecycle ────────────────────────────────────────────
    console.log("\n7. Student submission lifecycle...");
    const draft1 = await assignmentService.startOrResumeSubmission(studentAId, asg1.id);
    if (draft1.status !== "draft") throw new Error("Expected draft submission");
    const resumed = await assignmentService.startOrResumeSubmission(studentAId, asg1.id);
    if (resumed.id !== draft1.id) throw new Error("Resume must return the SAME row");

    // Un-enrolled student cannot even start
    await expectThrows(
      "un-enrolled student starts submission",
      () => assignmentService.startOrResumeSubmission(studentBId, asg1.id),
      AssignmentNotFoundError
    );

    // File upload: happy path
    const stored = await assignmentService.uploadSubmissionFile(
      studentAId,
      asg1.id,
      makeFile("essay-draft.pdf", "application/pdf", 4096),
      storage
    );
    if (stored.originalFilename !== "essay-draft.pdf") throw new Error("Filename mismatch");
    if (stored.sizeBytes !== 4096) throw new Error("Size mismatch");
    const expectedKey = buildAssignmentStorageKey(
      courseA.id,
      asg1.id,
      draft1.id,
      stored.id,
      "essay-draft.pdf"
    );
    if (stored.storageKey !== expectedKey) {
      throw new Error(`Unexpected storage key: ${stored.storageKey}`);
    }
    if (!(await storage.headObject(stored.storageKey))) throw new Error("Object missing in storage");
    console.log(`✓ Uploaded file ${stored.id} with server-derived key.`);

    // Upload validations
    await expectThrows(
      "wrong mime type upload",
      () =>
        assignmentService.uploadSubmissionFile(
          studentAId,
          asg1.id,
          makeFile("malware.exe", "application/octet-stream"),
          storage
        ),
      UnsupportedFileTypeError
    );
    await expectThrows(
      "extension/mime mismatch upload",
      () =>
        assignmentService.uploadSubmissionFile(
          studentAId,
          asg1.id,
          makeFile("fake.pdf", "text/plain"),
          storage
        ),
      UnsupportedFileTypeError
    );
    await expectThrows(
      "oversize upload",
      () =>
        assignmentService.uploadSubmissionFile(
          studentAId,
          asg1.id,
          makeFile("big.pdf", "application/pdf", 3 * 1024 * 1024),
          storage
        ),
      FileTooLargeError
    );
    await expectThrows(
      "path traversal filename",
      () =>
        assignmentService.uploadSubmissionFile(
          studentAId,
          asg1.id,
          makeFile("../etc/passwd.pdf", "application/pdf"),
          storage
        ),
      InvalidFileError
    );
    console.log("✓ Upload validation rejects wrong mime, mismatch, oversize and traversal names.");

    // Storage failure rolls back the DB row
    const beforeFailure = (await assignmentService.getSubmissionFilesForStudent(studentAId, draft1.id))!
      .length;
    const failingStorage = new FailingPutStorage();
    await expectThrows(
      "upload with failing storage",
      () =>
        assignmentService.uploadSubmissionFile(
          studentAId,
          asg1.id,
          makeFile("will-fail.pdf", "application/pdf"),
          failingStorage
        ),
      UploadFailedError
    );
    const afterFailure = (await assignmentService.getSubmissionFilesForStudent(studentAId, draft1.id))!
      .length;
    if (afterFailure !== beforeFailure) {
      throw new Error("Failed upload left an orphaned DB row!");
    }
    console.log("✓ Failed R2 write rolled back the file row.");

    // Submit
    const submitted = await assignmentService.submitSubmission(studentAId, asg1.id);
    if (submitted.status !== "submitted") throw new Error("Submit failed");
    if (submitted.isLate) throw new Error("Must not be late before the deadline");
    if (!submitted.submittedAt) throw new Error("submittedAt missing");

    // Resubmission window still open → can replace files
    const extra = await assignmentService.uploadSubmissionFile(
      studentAId,
      asg1.id,
      makeFile("essay-final.pdf", "application/pdf"),
      storage
    );
    if (!extra) throw new Error("Resubmission-window upload failed");

    // Cross-student isolation on every entry point
    if (
      (await assignmentService.getSubmissionFilesForStudent(studentBId, draft1.id)) !== null
    ) {
      throw new Error("Student B must NOT see student A's submission files");
    }
    console.log("✓ Submit + resubmission window + cross-student isolation verified.");

    // ── 7. Deadline / lateness policy (server time) ────────────────────────
    console.log("\n8. Lateness policy...");
    const lateStrict = await assignmentService.createAssignment(teacherAId, {
      courseId: courseA.id,
      title: "Late Strict Assignment",
      instructions: "Deadline already passed; late submissions rejected.",
      dueAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      maxPoints: 10,
      allowLateSubmission: false,
      allowedFileTypes: [],
      maxFileSize: 1024,
    });
    // Past-due cannot be published… but for THIS scenario we want it live:
    // simulate a deadline passing AFTER publish by publishing first is impossible;
    // so flip status directly through the service-owned table.
    await db
      .update(assignments)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(assignments.id, lateStrict.id));

    await expectThrows(
      "late submission rejected",
      () => assignmentService.submitSubmission(studentAId, lateStrict.id),
      LateSubmissionNotAllowedError
    );

    const lateLenient = await assignmentService.createAssignment(teacherAId, {
      courseId: courseA.id,
      title: "Late Lenient Assignment",
      instructions: "Deadline passed but late submissions accepted.",
      dueAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      maxPoints: 10,
      allowLateSubmission: true,
      allowedFileTypes: [],
      maxFileSize: 1024,
    });
    await db
      .update(assignments)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(assignments.id, lateLenient.id));
    const lateSubmission = await assignmentService.submitSubmission(studentAId, lateLenient.id);
    if (!lateSubmission.isLate) throw new Error("Server-time lateness flag missing");
    console.log("✓ Server-time lateness enforced (reject/allow + isLate stamp).");

    // ── 8. Close / reopen lifecycle gates submissions ─────────────────────
    console.log("\n9. Close/reopen lifecycle...");
    const closed = await assignmentService.closeAssignment(teacherAId, asg1.id);
    if (closed.status !== "closed" || !closed.closedAt) throw new Error("Close failed");
    await expectThrows(
      "submit into closed assignment",
      () => assignmentService.startOrResumeSubmission(studentAId, asg1.id),
      AssignmentClosedError
    );
    await assignmentService.reopenAssignment(teacherAId, asg1.id);
    const reopenedOk = await assignmentService.startOrResumeSubmission(studentAId, asg1.id);
    if (reopenedOk.id !== draft1.id) throw new Error("Reopen must restore the same submission row");
    console.log("✓ Closed assignments reject activity; reopen restores access.");

    // ── 9. Grading ─────────────────────────────────────────────────────────
    console.log("\n10. Grading...");
    await expectThrows(
      "cross-teacher grading",
      () => assignmentService.gradeSubmission(teacherBId, draft1.id, 10, null),
      SubmissionNotFoundError
    );
    await expectThrows(
      "grade out of range",
      () => assignmentService.gradeSubmission(teacherAId, draft1.id, 61, null),
      InvalidGradeError
    );

    // Grade the submitted work
    const graded = await assignmentService.gradeSubmission(
      teacherAId,
      draft1.id,
      55,
      "  Strong argument.  "
    );
    if (graded.status !== "graded" || graded.points !== 55) throw new Error("Grading failed");
    if (graded.feedback !== "Strong argument.") throw new Error("Feedback trim failed");
    if (graded.gradedBy !== teacherAId || !graded.gradedAt) throw new Error("Grader stamp missing");

    // Re-grade overwrites atomically
    const reGraded = await assignmentService.gradeSubmission(teacherAId, draft1.id, 58, null);
    if (reGraded.points !== 58 || reGraded.feedback !== null) throw new Error("Re-grade failed");

    // Graded is final for students
    await expectThrows(
      "upload into graded submission",
      () =>
        assignmentService.uploadSubmissionFile(
          studentAId,
          asg1.id,
          makeFile("late-fix.pdf", "application/pdf"),
          storage
        ),
      AssignmentAlreadyGradedError
    );
    await expectThrows(
      "resubmit graded work",
      () => assignmentService.submitSubmission(studentAId, asg1.id),
      AssignmentAlreadyGradedError
    );

    // Drafts cannot be graded — dedicated assignment kept open past grading time
    const draftOnly = await assignmentService.createAssignment(teacherAId, {
      courseId: courseA.id,
      title: "Draft Only Assignment",
      instructions: "Work saved as draft; grading drafts must be rejected.",
      dueAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      maxPoints: 10,
      allowLateSubmission: false,
      allowedFileTypes: [],
      maxFileSize: 1024,
    });
    await assignmentService.publishAssignment(teacherAId, draftOnly.id);
    const pureDraft = await assignmentService.startOrResumeSubmission(studentAId, draftOnly.id);
    if (pureDraft.status !== "draft") throw new Error("Expected a pure draft");
    await expectThrows(
      "grade a draft submission",
      () => assignmentService.gradeSubmission(teacherAId, pureDraft.id, 5, null),
      SubmissionNotGradeableError
    );

    // Teacher views
    const subsList = await assignmentService.getSubmissionsForAssignment(teacherAId, asg1.id);
    if (subsList.length !== 1) throw new Error(`Expected 1 submission, got ${subsList.length}`);
    if (subsList[0].studentEmail.includes("@test.com") === false) {
      throw new Error("Student identity not joined");
    }
    await expectThrows(
      "teacher B lists teacher A's submissions",
      () => assignmentService.getSubmissionsForAssignment(teacherBId, asg1.id),
      AssignmentNotFoundError
    );
    const detail = await assignmentService.getSubmissionDetailForTeacher(teacherAId, draft1.id);
    if (!detail || detail.files.length !== 2) throw new Error("Detail/files view broken");
    if ((await assignmentService.getSubmissionDetailForTeacher(teacherBId, draft1.id)) !== null) {
      throw new Error("Cross-teacher detail must behave like Not Found");
    }
    console.log("✓ Grading bounds, finality, stamps and teacher views verified.");

    // ── 10. Download resolver authorization matrix ─────────────────────────
    console.log("\n11. Submission file download resolution...");
    const fileId = extra.id;
    if ((await assignmentService.resolveSubmissionFileForUser(studentAId, "student", draft1.id, fileId)) === null) {
      throw new Error("Owner student must resolve their file");
    }
    if ((await assignmentService.resolveSubmissionFileForUser(teacherAId, "teacher", draft1.id, fileId)) === null) {
      throw new Error("Owning teacher must resolve the file");
    }
    if ((await assignmentService.resolveSubmissionFileForUser(studentBId, "student", draft1.id, fileId)) !== null) {
      throw new Error("Foreign student must NOT resolve the file");
    }
    if ((await assignmentService.resolveSubmissionFileForUser(teacherBId, "teacher", draft1.id, fileId)) !== null) {
      throw new Error("Foreign teacher must NOT resolve the file");
    }
    console.log("✓ Resolver grants owner student + owning teacher only.");

    // ── 11. Statistics ─────────────────────────────────────────────────────
    console.log("\n12. Statistics...");
    const stats = await assignmentService.getAssignmentStatistics(teacherAId, asg1.id);
    if (stats.totalEnrolled < 1) throw new Error("totalEnrolled wrong");
    if (stats.submittedCount !== 1 || stats.gradedCount !== 1) {
      throw new Error(`Stats mismatch: ${JSON.stringify(stats)}`);
    }
    if (stats.averageScore !== 58) throw new Error(`Average wrong: ${stats.averageScore}`);
    console.log(`✓ Stats: ${JSON.stringify(stats)}`);

    // ── 12. Delete rules ───────────────────────────────────────────────────
    console.log("\n13. Deletion rules and cleanup of storage objects...");
    // closed assignment CAN be deleted; objects best-effort removed.
    // asg1 was reopened earlier, so close it again first — deleting a
    // published assignment must stay blocked even for the owner.
    await expectThrows(
      "delete still-published assignment",
      () => assignmentService.deleteAssignment(teacherAId, asg1.id),
      AssignmentCannotDeleteError
    );
    await assignmentService.closeAssignment(teacherAId, asg1.id);
    const objectCountBefore = storage.objectCount();
    await assignmentService.deleteAssignment(teacherAId, asg1.id, storage);
    const remaining = await db
      .select()
      .from(assignmentSubmissions)
      .where(eq(assignmentSubmissions.assignmentId, asg1.id));
    if (remaining.length !== 0) throw new Error("Cascade delete failed");
    if (storage.objectCount() >= objectCountBefore) {
      throw new Error("Best-effort storage cleanup did not remove any objects");
    }
    const orphanedFiles = await db
      .select()
      .from(assignmentSubmissionFiles)
      .where(inArray(assignmentSubmissionFiles.submissionId, [draft1.id]));
    if (orphanedFiles.length !== 0) throw new Error("File rows were not cascaded");
    console.log("✓ Closed assignment deleted with cascades + storage cleanup.");

    console.log("\n=== ALL ASSIGNMENTS DOMAIN & SECURITY TESTS PASSED ===");
  } finally {
    console.log("\nCleaning up test data...");
    if (courseIds.length > 0) {
      await db.delete(courses).where(inArray(courses.id, courseIds));
    }
    await db.delete(users).where(inArray(users.id, userIds));
    console.log("✓ Cleanup complete.");
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ TEST FAILURE:", error);
    process.exit(1);
  });