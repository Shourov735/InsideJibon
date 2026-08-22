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
  courses,
  exams,
  questionOptions,
  questions,
  users,
} from "../src/db/schema";
import * as courseService from "../src/services/courses";
import * as examService from "../src/services/exams";
import {
  createExamSchema,
  createOptionSchema,
  createQuestionSchema,
  examActionByIdSchema,
  updateExamSchema,
  updateQuestionSchema,
} from "../src/schemas/exam";
import { isUuid } from "../src/lib/utils";

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
  console.log("=== STARTING INSIDEJIBON EXAM DOMAIN & SECURITY TESTS ===\n");

  const suffix = Date.now();
  const teacherAId = `test_exm_ta_${suffix}`;
  const teacherBId = `test_exm_tb_${suffix}`;
  const studentId = `test_exm_st_${suffix}`;

  let courseAId = "";
  let examAId = "";
  let examBId = "";
  const questionIds: string[] = [];
  const optionIds: string[] = [];

  try {
    // Setup: teachers A & B plus a student-role user
    console.log("0. Setting up test users...");
    await db.insert(users).values([
      { id: teacherAId, email: `exm_a_${suffix}@test.com`, name: "Exam Teacher A", role: "teacher" },
      { id: teacherBId, email: `exm_b_${suffix}@test.com`, name: "Exam Teacher B", role: "teacher" },
      { id: studentId, email: `exm_s_${suffix}@test.com`, name: "Exam Student", role: "student" },
    ]);
    console.log("✓ Test users created.");

    // 1. Teacher creates an exam for their own course
    console.log("\n1. Teacher A creates an exam...");
    const courseA = await courseService.createCourse(teacherAId, {
      title: `Examination Course A ${suffix}`,
      description: "Course used to host Phase 3A examination tests.",
    });
    courseAId = courseA.id;
    const courseB = await courseService.createCourse(teacherBId, {
      title: `Examination Course B ${suffix}`,
      description: "Course B used to host Phase 3A examination tests.",
    });

    const examA = await examService.createExam(teacherAId, {
      courseId: courseA.id,
      title: "Midterm Examination",
      description: "Comprehensive midterm covering modules one through four.",
      durationMinutes: 60,
    });
    examAId = examA.id;
    console.log(`✓ Exam created: ID=${examA.id}, status=${examA.status}`);
    if (examA.status !== "draft") throw new Error("Expected initial exam status to be draft");
    if (examA.durationMinutes !== 60) throw new Error("Expected duration to be persisted");

    // 2. Teacher cannot create an exam for a course they do not own
    console.log("\n2. Teacher B cannot create an exam for Teacher A's course...");
    await expectThrows(
      "Teacher B creates exam on Teacher A's course",
      () =>
        examService.createExam(teacherBId, {
          courseId: courseA.id,
          title: "Stolen Exam",
          description: "This exam must never be created.",
        }),
      examService.ExamNotFoundError
    );
    console.log("✓ Blocked with a generic not-found error (no existence leak).");

    // 3. Teacher B cannot modify Teacher A's exam
    console.log("\n3. Teacher B cannot update Teacher A's exam...");
    await expectThrows(
      "Teacher B updates Teacher A's exam",
      () =>
        examService.updateExam(teacherBId, examA.id, {
          examId: examA.id,
          courseId: courseA.id,
          title: "Hacked Exam Title",
          description: "This update must never succeed.",
        }),
      examService.ExamNotFoundError
    );
    await expectThrows(
      "Teacher B publishes Teacher A's exam",
      () => examService.publishExam(teacherBId, examA.id),
      examService.ExamNotFoundError
    );
    await expectThrows(
      "Teacher B archives Teacher A's exam",
      () => examService.archiveExam(teacherBId, examA.id),
      examService.ExamNotFoundError
    );
    await expectThrows(
      "Teacher B deletes Teacher A's exam",
      () => examService.deleteExam(teacherBId, examA.id),
      examService.ExamNotFoundError
    );
    const stillThere = await examService.getTeacherExamById(teacherAId, examA.id);
    if (!stillThere) throw new Error("Exam A vanished after Teacher B's attacks!");
    console.log("✓ All Teacher B exam mutations blocked; exam untouched.");

    // 4. Teacher B cannot add questions to Teacher A's exam
    console.log("\n4. Teacher B cannot add questions to Teacher A's exam...");
    await expectThrows(
      "Teacher B creates a question in Teacher A's exam",
      () =>
        examService.createQuestion(teacherBId, {
          examId: examA.id,
          questionText: "Malicious question",
        }),
      examService.ExamNotFoundError
    );
    console.log("✓ Blocked.");

    // 5. Teacher A builds a valid question with options
    console.log("\n5. Teacher A creates questions and options...");
    const q1 = await examService.createQuestion(teacherAId, {
      examId: examA.id,
      questionText: "What is the unit of force?",
      marks: 2,
    });
    questionIds.push(q1.id);
    const q1o1 = await examService.createOption(teacherAId, {
      questionId: q1.id,
      optionText: "Newton",
      isCorrect: true,
    });
    optionIds.push(q1o1.id);
    const q1o2 = await examService.createOption(teacherAId, {
      questionId: q1.id,
      optionText: "Joule",
    });
    optionIds.push(q1o2.id);
    if (!q1o1.isCorrect || q1o2.isCorrect) throw new Error("Correct option marking failed");

    // Marking a second option correct replaces the first (radio behavior)
    await examService.updateOption(teacherAId, {
      optionId: q1o2.id,
      optionText: "Joule",
      isCorrect: true,
    });
    const q1After = (await examService.getTeacherExamWithQuestions(teacherAId, examA.id))!;
    const q1Correct = q1After.questions[0].options.filter((o) => o.isCorrect);
    if (q1Correct.length !== 1 || q1Correct[0].id !== q1o2.id) {
      throw new Error("Marking a new correct option must replace the old one");
    }
    await examService.updateOption(teacherAId, {
      optionId: q1o1.id,
      optionText: "Newton",
      isCorrect: true,
    });
    console.log("✓ Options created; exactly-one-correct enforced on write.");

    // 6. Teacher B cannot modify Teacher A's questions or options
    console.log("\n6. Teacher B cannot modify Teacher A's questions/options...");
    await expectThrows(
      "Teacher B updates Teacher A's question",
      () =>
        examService.updateQuestion(teacherBId, {
          examId: examA.id,
          questionId: q1.id,
          questionText: "Hacked question",
          marks: 1,
        }),
      examService.ExamNotFoundError
    );
    await expectThrows(
      "Teacher B deletes Teacher A's question",
      () => examService.deleteQuestion(teacherBId, examA.id, q1.id),
      examService.ExamNotFoundError
    );
    await expectThrows(
      "Teacher B adds an option to Teacher A's question",
      () =>
        examService.createOption(teacherBId, {
          questionId: q1.id,
          optionText: "Malicious option",
        }),
      examService.ExamNotFoundError
    );
    await expectThrows(
      "Teacher B updates Teacher A's option",
      () =>
        examService.updateOption(teacherBId, {
          optionId: q1o1.id,
          optionText: "Hacked option",
          isCorrect: true,
        }),
      examService.ExamNotFoundError
    );
    await expectThrows(
      "Teacher B deletes Teacher A's option",
      () => examService.deleteOption(teacherBId, q1o1.id),
      examService.ExamNotFoundError
    );
    console.log("✓ All cross-teacher question/option mutations blocked.");

    // 7. Invalid question data is rejected (schema level)
    console.log("\n7. Invalid question/option data is rejected...");
    const badText = createQuestionSchema.safeParse({
      examId: examA.id,
      questionText: "  ",
    });
    if (badText.success) throw new Error("Blank question text must be rejected");
    const badMarks = createQuestionSchema.safeParse({
      examId: examA.id,
      questionText: "Valid text",
      marks: 0,
    });
    if (badMarks.success) throw new Error("Zero marks must be rejected");
    const badOption = createOptionSchema.safeParse({
      questionId: q1.id,
      optionText: "",
    });
    if (badOption.success) throw new Error("Blank option text must be rejected");
    const badExam = createExamSchema.safeParse({ courseId: examA.id, title: "x" });
    if (badExam.success) throw new Error("Short exam title must be rejected");
    console.log("✓ Schema validation rejects malformed payloads.");

    // 8. Exam without options cannot publish
    console.log("\n8. Question without options blocks publishing...");
    const qNoOptions = await examService.createQuestion(teacherAId, {
      examId: examA.id,
      questionText: "This question has no options yet.",
      marks: 1,
    });
    questionIds.push(qNoOptions.id);
    let check = await examService.validateExamForPublishing(teacherAId, examA.id);
    if (check.canPublish) throw new Error("Exam with an option-less question must not publish");
    if (!check.errors.some((e) => e.includes("at least two answer options"))) {
      throw new Error(`Missing 'at least two options' error: ${check.errors.join(" | ")}`);
    }
    await expectThrows(
      "Publishing an exam with an option-less question",
      () => examService.publishExam(teacherAId, examA.id),
      examService.ExamPublishBlockedError
    );
    console.log(`✓ Blocked: ${check.errors[0]}`);

    // Give the question valid options so the next invariant can be tested alone
    const noOpt1 = await examService.createOption(teacherAId, { questionId: qNoOptions.id, optionText: "Option A" });
    const noOpt2 = await examService.createOption(teacherAId, { questionId: qNoOptions.id, optionText: "Option B" });
    optionIds.push(noOpt1.id, noOpt2.id);

    // 9. Zero correct answers blocks publishing
    console.log("\n9. Zero correct answers blocks publishing...");
    check = await examService.validateExamForPublishing(teacherAId, examA.id);
    if (check.canPublish) throw new Error("Exam with zero correct answers must not publish");
    if (!check.errors.some((e) => e.includes("exactly one correct"))) {
      throw new Error(`Missing 'exactly one correct' error: ${check.errors.join(" | ")}`);
    }
    await expectThrows(
      "Publishing with zero correct answers",
      () => examService.publishExam(teacherAId, examA.id),
      examService.ExamPublishBlockedError
    );
    console.log(`✓ Blocked: ${check.errors[0]}`);

    // 10. Multiple correct answers blocks publishing
    console.log("\n10. Multiple correct answers blocks publishing...");
    await examService.updateOption(teacherAId, {
      optionId: noOpt1.id,
      optionText: "Option A",
      isCorrect: true,
    });
    // Simulate a second correct answer slipping in (e.g. legacy/corrupt data)
    await db
      .update(questionOptions)
      .set({ isCorrect: true })
      .where(eq(questionOptions.id, noOpt2.id));
    check = await examService.validateExamForPublishing(teacherAId, examA.id);
    if (check.canPublish) throw new Error("Exam with two correct answers must not publish");
    if (!check.errors.some((e) => e.includes("currently 2 are marked correct"))) {
      throw new Error(`Missing 'currently 2' error: ${check.errors.join(" | ")}`);
    }
    await expectThrows(
      "Publishing with two correct answers",
      () => examService.publishExam(teacherAId, examA.id),
      examService.ExamPublishBlockedError
    );
    console.log(`✓ Blocked: ${check.errors[0]}`);
    await examService.updateOption(teacherAId, {
      optionId: noOpt2.id,
      optionText: "Option B",
      isCorrect: false,
    });

    // 14. Question reordering produces valid positions
    console.log("\n14. Question reordering produces valid positions...");
    const q2 = await examService.createQuestion(teacherAId, {
      examId: examA.id,
      questionText: "What is the capital of France?",
      marks: 1,
    });
    const q3 = await examService.createQuestion(teacherAId, {
      examId: examA.id,
      questionText: "Which planet is closest to the Sun?",
      marks: 3,
    });
    questionIds.push(q2.id, q3.id);
    for (const q of [q2, q3]) {
      await examService.createOption(teacherAId, { questionId: q.id, optionText: "Option A", isCorrect: true });
      await examService.createOption(teacherAId, { questionId: q.id, optionText: "Option B" });
    }
    await examService.reorderQuestions(teacherAId, examA.id, [q3.id, q1.id, q2.id, qNoOptions.id]);
    const reordered = (await examService.getTeacherExamWithQuestions(teacherAId, examA.id))!;
    const order = reordered.questions.map((q) => q.id);
    const expected = [q3.id, q1.id, q2.id, qNoOptions.id];
    if (JSON.stringify(order) !== JSON.stringify(expected)) {
      throw new Error(`Reorder failed: got ${order.join(",")}`);
    }
    if (reordered.questions.map((q) => q.position).join(",") !== "1,2,3,4") {
      throw new Error("Positions must be compact 1..N after reorder");
    }
    if (reordered.totalMarks !== 3 + 2 + 1 + 1) {
      throw new Error(`Total marks wrong: ${reordered.totalMarks}`);
    }
    console.log("✓ Reorder produced positions 1,2,3,4 in the requested order.");

    // Foreign question IDs in a reorder are rejected
    await expectThrows(
      "Reorder with a question from another exam",
      () => examService.reorderQuestions(teacherAId, examA.id, [q3.id, examBId || "00000000-0000-0000-0000-000000000000"]),
      examService.ExamNotFoundError
    );

    // 11. Valid exam can publish
    console.log("\n11. Publishing a valid exam...");
    check = await examService.validateExamForPublishing(teacherAId, examA.id);
    if (!check.canPublish) {
      throw new Error(`Valid exam rejected: ${check.errors.join(" | ")}`);
    }
    const published = await examService.publishExam(teacherAId, examA.id);
    if (published.status !== "published" || !published.publishedAt) {
      throw new Error("Published exam must carry status + publishedAt");
    }
    console.log("✓ Exam published with status + publishedAt set.");

    // 18. Published exam lifecycle rules are enforced
    console.log("\n18. Published exam lifecycle rules...");
    await expectThrows(
      "Adding a question to a published exam",
      () =>
        examService.createQuestion(teacherAId, {
          examId: examA.id,
          questionText: "Too late question",
        }),
      examService.ExamNotEditableError
    );
    await expectThrows(
      "Updating a question of a published exam",
      () =>
        examService.updateQuestion(teacherAId, {
          examId: examA.id,
          questionId: q1.id,
          questionText: "Too late edit",
          marks: 1,
        }),
      examService.ExamNotEditableError
    );
    await expectThrows(
      "Deleting a question of a published exam",
      () => examService.deleteQuestion(teacherAId, examA.id, q1.id),
      examService.ExamNotEditableError
    );
    await expectThrows(
      "Reordering a published exam",
      () => examService.reorderQuestions(teacherAId, examA.id, [q1.id, q2.id, q3.id, qNoOptions.id]),
      examService.ExamNotEditableError
    );
    await expectThrows(
      "Adding an option to a published exam",
      () =>
        examService.createOption(teacherAId, { questionId: q1.id, optionText: "Late option" }),
      examService.ExamNotEditableError
    );
    await expectThrows(
      "Updating an option of a published exam",
      () =>
        examService.updateOption(teacherAId, { optionId: q1o1.id, optionText: "Late edit", isCorrect: true }),
      examService.ExamNotEditableError
    );
    await expectThrows(
      "Deleting an option of a published exam",
      () => examService.deleteOption(teacherAId, q1o1.id),
      examService.ExamNotEditableError
    );
    await expectThrows(
      "Deleting a published exam outright",
      () => examService.deleteExam(teacherAId, examA.id),
      examService.ExamCannotDeleteError
    );
    console.log("✓ Structural mutations and deletion blocked while published.");

    // 12. Draft exam is not returned by published-exam queries
    console.log("\n12. Draft exams excluded from published-only queries...");
    const examBDraft = await examService.createExam(teacherBId, {
      courseId: courseB.id,
      title: "Draft Exam B",
      description: "This exam must never appear in published queries.",
    });
    examBId = examBDraft.id;
    const publishedOnly = await db
      .select({ id: exams.id })
      .from(exams)
      .where(eq(exams.status, "published"));
    const publishedIds = new Set(publishedOnly.map((r) => r.id));
    if (publishedIds.has(examBDraft.id)) {
      throw new Error("Draft exam leaked into a published-only query!");
    }
    console.log("✓ Draft exam hidden from published-only query.");

    // 13. Archived exam is not returned by active queries
    console.log("\n13. Archived exams excluded from active queries...");
    const archived = await examService.archiveExam(teacherBId, examBDraft.id);
    if (archived.status !== "archived") throw new Error("Expected archived status");
    const activeOnly = await db
      .select({ id: exams.id })
      .from(exams)
      .where(eq(exams.status, "draft"));
    const activeIds = new Set(activeOnly.map((r) => r.id));
    if (activeIds.has(examBDraft.id)) {
      throw new Error("Archived exam leaked into an active (draft) query!");
    }
    const teacherBList = await examService.getTeacherExams(teacherBId, courseB.id);
    if (teacherBList.length !== 1 || teacherBList[0].status !== "archived") {
      throw new Error("Teacher listing should still show the archived exam to its owner");
    }
    console.log("✓ Archived exam hidden from active queries, visible to its owner.");

    // Restore + republish cycle works
    const restored = await examService.restoreExam(teacherBId, examBDraft.id);
    if (restored.status !== "draft") throw new Error("Expected draft after restore");

    // 15. Unauthorized (non-teacher) users cannot drive teacher mutations
    console.log("\n15. Student-role users cannot drive teacher mutations...");
    await expectThrows(
      "Student creates an exam",
      () =>
        examService.createExam(studentId, {
          courseId: courseA.id,
          title: "Student Exam",
          description: "Students have no exam management rights.",
        }),
      examService.ExamNotFoundError
    );
    await expectThrows(
      "Student publishes Teacher A's exam",
      () => examService.publishExam(studentId, examA.id),
      examService.ExamNotFoundError
    );
    await expectThrows(
      "Student adds a question to Teacher A's exam",
      () =>
        examService.createQuestion(studentId, {
          examId: examA.id,
          questionText: "Student question",
        }),
      examService.ExamNotFoundError
    );
    console.log("✓ Student identity cannot reach exam mutations (action layer additionally enforces requireTeacher).");

    // 16. Malformed IDs are rejected safely
    console.log("\n16. Malformed IDs are rejected safely...");
    const malformedSchema = examActionByIdSchema.safeParse({ examId: "not-a-uuid" });
    if (malformedSchema.success) throw new Error("Malformed examId must fail zod validation");
    const malformedUpdate = updateExamSchema.safeParse({
      examId: "nope",
      courseId: "nope",
      title: "Valid Title",
    });
    if (malformedUpdate.success) throw new Error("Malformed IDs must fail zod validation");
    const malformedQuestion = updateQuestionSchema.safeParse({
      examId: "nope",
      questionId: "nope",
      questionText: "Valid text",
      marks: 1,
    });
    if (malformedQuestion.success) throw new Error("Malformed question IDs must fail zod validation");
    await expectThrows(
      "Service with malformed exam id",
      () => examService.publishExam(teacherAId, "not-a-uuid"),
      examService.ExamNotFoundError
    );
    await expectThrows(
      "Service with malformed question id",
      () =>
        examService.createQuestion(teacherAId, {
          examId: "not-a-uuid",
          questionText: "Valid text",
        }),
      examService.ExamNotFoundError
    );
    await expectThrows(
      "Service with malformed option id",
      () => examService.deleteOption(teacherAId, "not-a-uuid"),
      examService.ExamNotFoundError
    );
    if (!isUuid(examA.id)) throw new Error("isUuid should accept the real generated uuid");
    console.log("✓ Malformed IDs rejected at schema and service layers without Postgres errors.");

    // 17. Cross-resource IDOR attempts fail without leaking existence
    console.log("\n17. Cross-resource IDOR attempts fail without leaking existence...");
    const idor = [
      () => examService.updateExam(teacherBId, examA.id, { examId: examA.id, courseId: courseA.id, title: "IDOR", description: "This is a long enough description." }),
      () => examService.publishExam(teacherBId, examA.id),
      () => examService.deleteExam(teacherBId, examA.id),
      () => examService.createQuestion(teacherBId, { examId: examA.id, questionText: "IDOR question" }),
      () => examService.updateQuestion(teacherBId, { examId: examA.id, questionId: q1.id, questionText: "IDOR", marks: 1 }),
      () => examService.deleteQuestion(teacherBId, examA.id, q1.id),
      () => examService.reorderQuestions(teacherBId, examA.id, [q1.id, q2.id, q3.id, qNoOptions.id]),
      () => examService.createOption(teacherBId, { questionId: q1.id, optionText: "IDOR option" }),
      () => examService.updateOption(teacherBId, { optionId: q1o1.id, optionText: "IDOR", isCorrect: true }),
      () => examService.deleteOption(teacherBId, q1o1.id),
    ];
    for (const attack of idor) {
      await expectThrows("IDOR attempt", attack, examService.ExamNotFoundError);
    }
    // Every IDOR error message must be the same generic text (no existence probing)
    const msgSet = new Set<string>();
    for (const attack of idor) {
      try {
        await attack();
      } catch (e) {
        msgSet.add((e as Error).message);
      }
    }
    if (msgSet.size !== 1 || !msgSet.has("Exam not found.")) {
      throw new Error(`IDOR errors leaked distinct messages: ${[...msgSet].join(" | ")}`);
    }
    console.log("✓ All IDOR attempts threw identical generic 'Exam not found.' errors.");

    // Sanity: Teacher A's exam is fully intact after every attack
    const intact = (await examService.getTeacherExamWithQuestions(teacherAId, examA.id))!;
    if (intact.questions.length !== 4 || intact.status !== "published") {
      throw new Error("Teacher A's exam was altered by cross-teacher attacks!");
    }

    // Metadata editing remains allowed on published exams
    const updatedMeta = await examService.updateExam(teacherAId, examA.id, {
      examId: examA.id,
      courseId: courseA.id,
      title: "Midterm Examination (Revised)",
      description: "Comprehensive midterm covering modules one through four.",
    });
    if (updatedMeta.title !== "Midterm Examination (Revised)") {
      throw new Error("Metadata update on published exam failed");
    }
    console.log("\n✓ Published exam metadata editing still allowed.");

    // Cleanup
    console.log("\n18. Cleaning up test data...");
    await db.delete(questions).where(inArray(questions.id, questionIds));
    await db.delete(exams).where(inArray(exams.id, [examAId, examBId]));
    await db.delete(courses).where(inArray(courses.id, [courseAId, courseB.id]));
    await db.delete(users).where(inArray(users.id, [teacherAId, teacherBId, studentId]));
    console.log("✓ Test cleanup completed.");

    console.log("\n============================================================");
    console.log("🎉 ALL EXAM DOMAIN & SECURITY TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("============================================================\n");
  } catch (err) {
    console.error("TEST FAILED WITH ERROR:", err);
    // Best-effort cleanup on failure
    try {
      await db.delete(questions).where(inArray(questions.id, questionIds));
      await db.delete(exams).where(inArray(exams.id, [examAId, examBId]));
      await db.delete(courses).where(inArray(courses.id, [courseAId]));
      await db.delete(users).where(inArray(users.id, [teacherAId, teacherBId, studentId]));
    } catch {
      // ignore
    }
    process.exit(1);
  }
}

runTests();