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
  examAnswers,
  examAttempts,
  examQuestions,
  exams,
  questionOptions,
  users,
} from "../src/db/schema";
import * as courseService from "../src/services/courses";
import * as enrollService from "../src/services/enrollments";
import * as examService from "../src/services/exams";
import {
  createOptionSchema,
  createQuestionSchema,
} from "../src/schemas/exam";
import {
  startExamSchema,
  submitExamSchema,
} from "../src/schemas/exam-attempt";
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

interface BuiltQuestion {
  id: string;
  correctOptionId: string;
  wrongOptionId: string;
  marks: number;
  position: number;
}

async function buildMcq(
  teacherId: string,
  examId: string,
  text: string,
  marks: number
): Promise<BuiltQuestion> {
  const q = await examService.createQuestion(teacherId, { examId, questionText: text, marks });
  const correct = await examService.createOption(teacherId, {
    questionId: q.id,
    optionText: `Correct option for ${text}`,
    isCorrect: true,
  });
  const wrong = await examService.createOption(teacherId, {
    questionId: q.id,
    optionText: `Wrong option for ${text}`,
  });
  return {
    id: q.id,
    correctOptionId: correct.id,
    wrongOptionId: wrong.id,
    marks,
    position: q.position,
  };
}

function hasNoAnswerLeak(payload: { questions: Array<{ options: Array<Record<string, unknown>>; explanation?: unknown }> }): boolean {
  for (const q of payload.questions) {
    if ("isCorrect" in q) return false;
    if (q.explanation != null) return false;
    for (const o of q.options) {
      if ("isCorrect" in o) return false;
    }
  }
  return true;
}

async function runTests() {
  console.log("=== STARTING INSIDEJIBON EXAM ATTEMPT DOMAIN & SECURITY TESTS ===\n");

  const suffix = Date.now();
  const teacherAId = `test_at_ta_${suffix}`;
  const teacherBId = `test_at_tb_${suffix}`;
  const studentSId = `test_at_ss_${suffix}`;
  const studentS2Id = `test_at_s2_${suffix}`;
  const studentS3Id = `test_at_s3_${suffix}`;

  let courseAId = "";
  let courseBId = "";
  let examAId = "";
  let examBId = "";
  let examCId = "";
  let examDraftId = "";
  let attempt1Id = "";
  let attempt2Id = "";
  const questionIds: string[] = [];
  const optionIds: string[] = [];

  try {
    // Setup users, courses (published), enrollment
    console.log("0. Setting up test users, published courses and enrollment...");
    await db.insert(users).values([
      { id: teacherAId, email: `at_a_${suffix}@test.com`, name: "Attempt Teacher A", role: "teacher" },
      { id: teacherBId, email: `at_b_${suffix}@test.com`, name: "Attempt Teacher B", role: "teacher" },
      { id: studentSId, email: `at_s_${suffix}@test.com`, name: "Attempt Student", role: "student" },
      { id: studentS2Id, email: `at_s2_${suffix}@test.com`, name: "Attempt Student 2", role: "student" },
      { id: studentS3Id, email: `at_s3_${suffix}@test.com`, name: "Attempt Student 3 (not enrolled)", role: "student" },
    ]);

    const courseA = await courseService.createCourse(teacherAId, {
      title: `Attempt Course A ${suffix}`,
      description: "Published course hosting Phase 4 attempt tests.",
    });
    courseAId = courseA.id;
    const courseB = await courseService.createCourse(teacherBId, {
      title: `Attempt Course B ${suffix}`,
      description: "Course B hosting the max-attempts test.",
    });
    courseBId = courseB.id;

    await db.update(courses).set({ status: "published" }).where(eq(courses.id, courseAId));
    await db.update(courses).set({ status: "published" }).where(eq(courses.id, courseBId));

    await enrollService.enrollStudent(studentSId, courseAId);
    await enrollService.enrollStudent(studentS2Id, courseAId);
    await enrollService.enrollStudent(studentSId, courseBId);
    console.log("✓ Setup complete.");

    // 1-2. Teacher creates an exam with MCQs (question bank rows)
    console.log("\n1-2. Teacher A creates exam and MCQ question bank rows...");
    const examA = await examService.createExam(teacherAId, {
      courseId: courseAId,
      title: "Phase 4 Midterm",
      description: "Midterm covering the Phase 4 attempt domain.",
      durationMinutes: 45,
      maxAttempts: 3,
    });
    examAId = examA.id;
    if (examA.maxAttempts !== 3) throw new Error("maxAttempts must be persisted");

    const q1 = await buildMcq(teacherAId, examAId, "What is the unit of force?", 2);
    const q2 = await buildMcq(teacherAId, examAId, "What is 2 + 2?", 1);
    const q3 = await buildMcq(teacherAId, examAId, "Which planet is closest to the Sun?", 3);
    questionIds.push(q1.id, q2.id, q3.id);
    optionIds.push(q1.correctOptionId, q1.wrongOptionId, q2.correctOptionId, q2.wrongOptionId, q3.correctOptionId, q3.wrongOptionId);
    console.log("✓ Exam + 3 MCQ questions created.");

    // 3. Question options are validated (schema level)
    console.log("\n3. Question options are validated...");
    const blankOption = createOptionSchema.safeParse({ questionId: q1.id, optionText: "" });
    if (blankOption.success) throw new Error("Blank option text must be rejected");
    const blankQuestion = createQuestionSchema.safeParse({ examId: examAId, questionText: "  " });
    if (blankQuestion.success) throw new Error("Blank question text must be rejected");
    console.log("✓ Schema rejects blank option/question text.");

    // 4. Exactly one correct answer required
    console.log("\n4. Exactly one correct answer required...");
    let check = await examService.validateExamForPublishing(teacherAId, examAId);
    if (!check.canPublish) throw new Error(`Valid exam rejected: ${check.errors.join(" | ")}`);
    const tamperedQ = await examService.createQuestion(teacherAId, {
      examId: examAId,
      questionText: "Question with no options",
    });
    await examService.createOption(teacherAId, { questionId: tamperedQ.id, optionText: "A" });
    await examService.createOption(teacherAId, { questionId: tamperedQ.id, optionText: "B" });
    check = await examService.validateExamForPublishing(teacherAId, examAId);
    if (check.canPublish || !check.errors.some((e) => e.includes("exactly one correct"))) {
      throw new Error(`Zero-correct must block publish: ${check.errors.join(" | ")}`);
    }
    await expectThrows(
      "Publishing with zero correct answers",
      () => examService.publishExam(teacherAId, examAId),
      examService.ExamPublishBlockedError
    );
    // Restore a correct answer so the exam becomes valid again, then remove
    // the tampered question — it only existed to test the publish invariant.
    await examService.updateOption(teacherAId, { optionId: q1.wrongOptionId, optionText: "Wrong", isCorrect: false });
    await examService.updateOption(teacherAId, {
      optionId: (await examService.getTeacherExamWithQuestions(teacherAId, examAId))!.questions.find((x) => x.id === tamperedQ.id)!.options[0].id,
      optionText: "A",
      isCorrect: true,
    });
    await examService.deleteQuestion(teacherAId, examAId, tamperedQ.id);
    console.log("✓ Exactly-one-correct enforced at publish.");

    // 5. Exam created
    console.log("\n5. Teacher creates exam (already covered by step 1-2).");

    // 6. Exam cannot publish without questions
    console.log("\n6. Exam cannot publish without questions...");
    const emptyExam = await examService.createExam(teacherAId, {
      courseId: courseAId,
      title: "Empty Exam",
      description: "An exam with no questions must never publish.",
    });
    check = await examService.validateExamForPublishing(teacherAId, emptyExam.id);
    if (check.canPublish) throw new Error("Empty exam must not be publishable");
    await expectThrows(
      "Publishing an exam with no questions",
      () => examService.publishExam(teacherAId, emptyExam.id),
      examService.ExamPublishBlockedError
    );
    console.log("✓ Empty exam blocked.");

    // 7. Invalid exam cannot publish (short title)
    console.log("\n7. Invalid exam cannot publish...");
    const shortExam = await examService.createExam(teacherAId, {
      courseId: courseAId,
      title: "Hi",
      description: "A short title must block publishing.",
    });
    check = await examService.validateExamForPublishing(teacherAId, shortExam.id);
    if (check.canPublish) throw new Error("Short-title exam must not be publishable");
    await expectThrows(
      "Publishing a short-title exam",
      () => examService.publishExam(teacherAId, shortExam.id),
      examService.ExamPublishBlockedError
    );
    console.log("✓ Short-title exam blocked.");

    // 8-9. Teacher B cannot modify Teacher A's bank or exam
    console.log("\n8-9. Teacher B cannot modify Teacher A's question bank or exam...");
    await expectThrows(
      "Teacher B updates Teacher A's question",
      () => examService.updateQuestion(teacherBId, { examId: examAId, questionId: q1.id, questionText: "Hacked", marks: 1 }),
      examService.ExamNotFoundError
    );
    await expectThrows(
      "Teacher B publishes Teacher A's exam",
      () => examService.publishExam(teacherBId, examAId),
      examService.ExamNotFoundError
    );
    console.log("✓ Cross-teacher mutations blocked.");

    // Publish the valid exam
    console.log("\n   Publishing the valid exam...");
    const published = await examService.publishExam(teacherAId, examAId);
    if (published.status !== "published") throw new Error("Exam must be published");
    console.log("✓ Exam A published.");

    // 10. Published exam visible to enrolled student
    console.log("\n10. Published exam visible to enrolled student...");
    const list = await examService.getStudentCourseExams(studentSId, courseAId);
    if (!list) throw new Error("Enrolled student must get a non-null exam list");
    const listed = list.find((e) => e.id === examAId);
    if (!listed) throw new Error("Published exam missing from enrolled student's list");
    if (listed.questionCount !== 3 || listed.totalMarks !== 6) {
      throw new Error(`Wrong exam stats: ${listed.questionCount}q/${listed.totalMarks}m`);
    }
    const detail = await examService.getStudentExamDetail(studentSId, examAId);
    if (!detail || detail.title !== "Phase 4 Midterm") throw new Error("Student detail missing");
    console.log(`✓ Visible with ${listed.questionCount} questions, ${listed.totalMarks} marks.`);

    // 11. Draft exam inaccessible to student
    console.log("\n11. Draft exam inaccessible to student...");
    const draftExam = await examService.createExam(teacherAId, {
      courseId: courseAId,
      title: "Draft Exam for Students",
      description: "This draft must never be visible to students.",
    });
    examDraftId = draftExam.id;
    if (await examService.getStudentExamDetail(studentSId, draftExam.id)) {
      throw new Error("Draft exam leaked to student detail!");
    }
    await expectThrows(
      "Student starts a draft exam",
      () => examService.startExam(studentSId, draftExam.id),
      examService.ExamAccessDeniedError
    );
    console.log("✓ Draft exam hidden from students.");

    // 12. Archived exam inaccessible to student
    console.log("\n12. Archived exam inaccessible to student...");
    await examService.archiveExam(teacherAId, draftExam.id);
    if (await examService.getStudentExamDetail(studentSId, draftExam.id)) {
      throw new Error("Archived exam leaked to student detail!");
    }
    await expectThrows(
      "Student starts an archived exam",
      () => examService.startExam(studentSId, draftExam.id),
      examService.ExamAccessDeniedError
    );
    console.log("✓ Archived exam hidden from students.");

    // 13. Non-enrolled student cannot start exam
    console.log("\n13. Non-enrolled student cannot start the exam...");
    await expectThrows(
      "Non-enrolled student starts the exam",
      () => examService.startExam(studentS3Id, examAId),
      examService.ExamAccessDeniedError
    );
    if (await examService.getStudentExamDetail(studentS3Id, examAId)) {
      throw new Error("Non-enrolled student must not see exam detail!");
    }
    console.log("✓ Non-enrolled student blocked.");

    // 14. Student can start a valid exam
    console.log("\n14. Student starts a valid exam...");
    const started = await examService.startExam(studentSId, examAId);
    attempt1Id = started.attemptId;
    if (!isUuid(attempt1Id)) throw new Error("Attempt id must be a uuid");
    if (started.attemptNumber !== 1) throw new Error("First attempt must be number 1");
    if (started.questions.length !== 3) throw new Error("Started payload must contain all questions");
    if (started.durationMinutes !== 45) throw new Error("Duration must be carried in the payload");
    if (!hasNoAnswerLeak(started)) throw new Error("Started payload leaked correct answers!");
    console.log(`✓ Attempt 1 started (id=${attempt1Id.slice(0, 8)}…), no answer leak.`);

    // 15. Attempt number increments
    console.log("\n15. Attempt number is correct for a second attempt...");
    const started2 = await examService.startExam(studentSId, examAId);
    attempt2Id = started2.attemptId;
    if (started2.attemptNumber !== 2) throw new Error("Second attempt must be number 2");
    console.log("✓ Attempt 2 numbered correctly.");

    // Resume payload also sanitized
    console.log("\n   Resume payload is sanitized...");
    const resumed = await examService.getAttemptForTaking(studentSId, attempt2Id);
    if (!resumed || resumed.attemptId !== attempt2Id) throw new Error("Resume failed");
    if (!hasNoAnswerLeak(resumed)) throw new Error("Resume payload leaked correct answers!");
    console.log("✓ Resume works without leaking answers.");

    // 16. Max attempt limit enforced
    console.log("\n16. Max attempt limit enforced...");
    const examB = await examService.createExam(teacherAId, {
      courseId: courseAId,
      title: "One-Shot Exam",
      description: "This exam allows exactly one attempt.",
      maxAttempts: 1,
    });
    examBId = examB.id;
    const bq = await buildMcq(teacherAId, examBId, "One-shot question", 1);
    questionIds.push(bq.id);
    optionIds.push(bq.correctOptionId, bq.wrongOptionId);
    await examService.publishExam(teacherAId, examBId);

    const bStart = await examService.startExam(studentSId, examBId);
    if (bStart.attemptNumber !== 1) throw new Error("Exam B first attempt must be 1");
    await examService.submitExam(studentSId, bStart.attemptId, [
      { questionId: bq.id, selectedOptionId: bq.correctOptionId },
    ]);
    await expectThrows(
      "Starting beyond max attempts",
      () => examService.startExam(studentSId, examBId),
      examService.ExamAttemptLimitError
    );
    const bDetail = await examService.getStudentExamDetail(studentSId, examBId);
    if (!bDetail || bDetail.attemptsUsed !== 1) throw new Error("attemptsUsed must be 1");
    console.log("✓ Second start blocked after the single attempt was used.");

    // 17. Student can submit a valid attempt (server grades)
    console.log("\n17-18. Student submits attempt; server grades MCQ answers...");
    const submitted = await examService.submitExam(studentSId, attempt2Id, [
      { questionId: q1.id, selectedOptionId: q1.correctOptionId }, // correct → 2
      { questionId: q2.id, selectedOptionId: q2.wrongOptionId }, // wrong → 0
      { questionId: q3.id, selectedOptionId: q3.correctOptionId }, // correct → 3
    ]);
    if (submitted.score !== 5) throw new Error(`Expected score 5, got ${submitted.score}`);
    if (submitted.totalPoints !== 6) throw new Error(`Expected total 6, got ${submitted.totalPoints}`);
    if (Math.abs(submitted.percentage - 83.33) > 0.01) {
      throw new Error(`Expected 83.33%, got ${submitted.percentage}`);
    }
    const q1Result = submitted.answers.find((a) => a.questionId === q1.id);
    const q2Result = submitted.answers.find((a) => a.questionId === q2.id);
    const q3Result = submitted.answers.find((a) => a.questionId === q3.id);
    if (!q1Result?.isCorrect || q1Result.awardedPoints !== 2) throw new Error("Q1 must be correct with 2 marks");
    if (!q2Result || q2Result.isCorrect || q2Result.awardedPoints !== 0) throw new Error("Q2 must be wrong with 0 marks");
    if (!q3Result?.isCorrect || q3Result.awardedPoints !== 3) throw new Error("Q3 must be correct with 3 marks");
    console.log(`✓ Score ${submitted.score}/${submitted.totalPoints} (${submitted.percentage}%) graded server-side.`);

    // Partial submission: unanswered question scores 0
    console.log("\n   Partial submission scores 0 for unanswered questions...");
    const partial = await examService.startExam(studentSId, examAId); // attempt 3
    const partialRes = await examService.submitExam(studentSId, partial.attemptId, [
      { questionId: q1.id, selectedOptionId: q1.correctOptionId },
    ]);
    if (partialRes.score !== 2 || partialRes.totalPoints !== 6) {
      throw new Error(`Partial submit must score 2/6, got ${partialRes.score}/${partialRes.totalPoints}`);
    }
    const partQ2 = partialRes.answers.find((a) => a.questionId === q2.id);
    if (partQ2 && partQ2.selectedOptionId != null) throw new Error("Unanswered question must have no selection");
    console.log("✓ Partial submission graded correctly (unanswered = 0).");

    // 19. Score cannot be supplied by client
    console.log("\n19. Score cannot be supplied by the client...");
    const malicious = submitExamSchema.safeParse({
      attemptId: attempt2Id,
      answers: [],
      score: 100,
      percentage: 100,
      awardedPoints: 100,
      isCorrect: true,
      studentId: studentSId,
    });
    if (malicious.success) throw new Error("Client-supplied score fields must be stripped/rejected by schema");
    const malformed = submitExamSchema.safeParse({
      attemptId: attempt2Id,
      answers: [{ questionId: q1.id, selectedOptionId: q1.correctOptionId, awardedPoints: 99, isCorrect: false }],
    });
    if (malformed.success) throw new Error("Per-answer awardedPoints must be rejected");
    console.log("✓ Submission schema rejects score/percentage/awardedPoints/isCorrect/studentId.");

    // 20. Duplicate submission rejected
    console.log("\n20. Duplicate submission rejected...");
    await expectThrows(
      "Submitting an already-submitted attempt",
      () =>
        examService.submitExam(studentSId, attempt2Id, [
          { questionId: q1.id, selectedOptionId: q1.correctOptionId },
        ]),
      examService.ExamAlreadySubmittedError
    );
    console.log("✓ Duplicate submit rejected.");

    // 21. Submitted attempt is immutable
    console.log("\n21. Submitted attempt is immutable...");
    const frozen = await db.select().from(examAttempts).where(eq(examAttempts.id, attempt2Id));
    if (frozen.length !== 1) throw new Error("Attempt row missing");
    if (frozen[0].status !== "submitted" || frozen[0].submittedAt == null) {
      throw new Error("Attempt must be terminal submitted");
    }
    if (await examService.getAttemptForTaking(studentSId, attempt2Id)) {
      throw new Error("Submitted attempt must not be resumable");
    }
    const answerRows = await db.select().from(examAnswers).where(eq(examAnswers.attemptId, attempt2Id));
    if (answerRows.length !== 3) throw new Error(`Expected 3 persisted answer rows, got ${answerRows.length}`);
    console.log("✓ Submitted attempt is terminal; answers persisted; no mutation path exists.");

    // 22. Student cannot access another student's attempt
    console.log("\n22. Student cannot access another student's attempt...");
    await expectThrows(
      "Student 2 submits Student 1's attempt",
      () =>
        examService.submitExam(studentS2Id, attempt2Id, [
          { questionId: q1.id, selectedOptionId: q1.correctOptionId },
        ]),
      examService.ExamAttemptNotFoundError
    );
    if (await examService.getAttemptForTaking(studentS2Id, attempt2Id)) {
      throw new Error("Student 2 must not resume Student 1's attempt");
    }
    if (await examService.getAttemptResult(studentS2Id, attempt2Id)) {
      throw new Error("Student 2 must not read Student 1's result");
    }
    console.log("✓ Foreign attempts rejected with generic not-found.");

    // 23. Correct answers not leaked before submission
    console.log("\n23. Correct answers are not leaked before submission...");
    const fresh = await examService.startExam(studentSId, examAId); // attempt 5
    if (!hasNoAnswerLeak(fresh)) throw new Error("Start payload leaked correct answers!");
    if (!hasNoAnswerLeak((await examService.getAttemptForTaking(studentSId, fresh.attemptId))!)) {
      throw new Error("Take payload leaked correct answers!");
    }
    // Detail page (intro) must also be clean
    const intro = await examService.getStudentExamDetail(studentSId, examAId);
    if (JSON.stringify(intro).includes("isCorrect") || JSON.stringify(intro).includes("correctOptionId")) {
      throw new Error("Intro/detail payload leaked correct-answer metadata!");
    }
    console.log("✓ No correct-answer data reaches the client before submission.");

    // 24. Historical result remains correct after question changes
    console.log("\n24. Historical result correct after teacher edits questions...");
    const beforeEditResult = await examService.getAttemptResult(studentSId, attempt2Id);
    if (!beforeEditResult) throw new Error("Result must exist before edits");
    const originalQ1Text = beforeEditResult.questions.find((q) => q.questionId === q1.id)!.questionText;
    const originalQ1Correct = beforeEditResult.questions.find((q) => q.questionId === q1.id)!.correctOptionId;
    const originalScore = beforeEditResult.score;

    // Teacher unpublishes, rewrites Q1 text and flips the correct answer
    await examService.unpublishExam(teacherAId, examAId);
    await examService.updateQuestion(teacherAId, { examId: examAId, questionId: q1.id, questionText: "REWRITTEN: force unit?", marks: 5 });
    await examService.updateOption(teacherAId, { optionId: q1.wrongOptionId, optionText: "Now correct", isCorrect: true });
    await examService.publishExam(teacherAId, examAId);

    const afterEditResult = await examService.getAttemptResult(studentSId, attempt2Id);
    if (!afterEditResult) throw new Error("Result must survive teacher edits");
    if (afterEditResult.score !== originalScore) {
      throw new Error(`Historical score changed after edit: ${afterEditResult.score} != ${originalScore}`);
    }
    const q1After = afterEditResult.questions.find((q) => q.questionId === q1.id)!;
    if (q1After.questionText !== originalQ1Text) {
      throw new Error("Historical question text changed after teacher edit!");
    }
    if (q1After.correctOptionId !== originalQ1Correct) {
      throw new Error("Historical correct answer changed after teacher edit!");
    }
    // New attempts after the edit see the NEW content
    const freshAfterEdit = await examService.startExam(studentSId, examAId);
    const newQ1 = freshAfterEdit.questions.find((q) => q.id === q1.id)!;
    if (!newQ1.questionText.includes("REWRITTEN")) {
      throw new Error("New attempt after republish must see the edited question");
    }
    if (newQ1.options.length !== 2) throw new Error("New attempt must see all options");
    const freshRes = await examService.submitExam(studentSId, freshAfterEdit.attemptId, [
      { questionId: q1.id, selectedOptionId: q1.wrongOptionId },
    ]);
    if (freshRes.score !== 5) throw new Error("New answer sheet must grade against the NEW correct option (5 marks)");
    console.log("✓ Old results frozen at snapshot; new attempts reflect edits.");

    // Concurrent double-submit: exactly one succeeds (dedicated unlimited exam)
    console.log("\n   Concurrent double-submit: exactly one succeeds...");
    const examC = await examService.createExam(teacherAId, {
      courseId: courseAId,
      title: "Concurrency Exam",
      description: "A dedicated exam to test concurrent double submission.",
    });
    examCId = examC.id;
    const cq = await buildMcq(teacherAId, examCId, "Concurrency question", 1);
    questionIds.push(cq.id);
    optionIds.push(cq.correctOptionId, cq.wrongOptionId);
    await examService.publishExam(teacherAId, examCId);

    const conc = await examService.startExam(studentSId, examCId);
    const [c1, c2] = await Promise.allSettled([
      examService.submitExam(studentSId, conc.attemptId, [
        { questionId: cq.id, selectedOptionId: cq.correctOptionId },
      ]),
      examService.submitExam(studentSId, conc.attemptId, [
        { questionId: cq.id, selectedOptionId: cq.correctOptionId },
      ]),
    ]);
    const fulfilledCount = (c1.status === "fulfilled" ? 1 : 0) + (c2.status === "fulfilled" ? 1 : 0);
    const rejected = c1.status === "rejected" ? c1 : c2;
    if (fulfilledCount !== 1) {
      throw new Error(`Concurrent submit must yield exactly one success: ${c1.status}/${c2.status}`);
    }
    if (rejected.status === "rejected" && !(rejected.reason instanceof examService.ExamAlreadySubmittedError)) {
      throw new Error(`Rejected concurrent submit must be AlreadySubmitted: ${(rejected.reason as Error).message}`);
    }
    const concRows = await db.select().from(examAnswers).where(eq(examAnswers.attemptId, conc.attemptId));
    if (concRows.length !== 1) throw new Error(`Concurrent submit must persist exactly 1 answer row, got ${concRows.length}`);
    console.log("✓ Atomic submit guard allowed one winner, rejected the duplicate.");

    // Malformed IDs handled safely
    console.log("\n   Malformed IDs rejected safely...");
    const badStart = startExamSchema.safeParse({ examId: "nope" });
    if (badStart.success) throw new Error("Malformed examId must fail startExam schema");
    const badSubmit = submitExamSchema.safeParse({ attemptId: "nope", answers: [] });
    if (badSubmit.success) throw new Error("Malformed attemptId must fail submit schema");
    await expectThrows(
      "startExam with malformed id",
      () => examService.startExam(studentSId, "not-a-uuid"),
      examService.ExamAccessDeniedError
    );
    await expectThrows(
      "submitExam with malformed id",
      () => examService.submitExam(studentSId, "not-a-uuid", []),
      examService.ExamAttemptNotFoundError
    );
    if (await examService.getAttemptResult(studentSId, "not-a-uuid")) {
      throw new Error("Malformed result id must return null");
    }
    console.log("✓ Malformed IDs rejected without Postgres errors.");

    // Cleanup
    console.log("\n   Cleaning up test data...");
    await db.delete(questionOptions).where(inArray(questionOptions.questionId, questionIds));
    await db.delete(examQuestions).where(eq(examQuestions.examId, examAId));
    await db.delete(examQuestions).where(eq(examQuestions.examId, examBId));
    await db.delete(exams).where(inArray(exams.id, [examAId, examBId, examCId, examDraftId, emptyExam.id, shortExam.id]));
    await db.delete(courses).where(inArray(courses.id, [courseAId, courseBId]));
    await db.delete(users).where(inArray(users.id, [teacherAId, teacherBId, studentSId, studentS2Id, studentS3Id]));
    console.log("✓ Test cleanup completed.");

    console.log("\n============================================================");
    console.log("🎉 ALL EXAM ATTEMPT DOMAIN & SECURITY TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("============================================================\n");
  } catch (err) {
    console.error("TEST FAILED WITH ERROR:", err);
    try {
      await db.delete(questionOptions).where(inArray(questionOptions.questionId, questionIds));
      await db.delete(examQuestions).where(eq(examQuestions.examId, examAId));
      await db.delete(examQuestions).where(eq(examQuestions.examId, examBId));
      await db.delete(exams).where(inArray(exams.id, [examAId, examBId, examCId, examDraftId]));
      await db.delete(courses).where(inArray(courses.id, [courseAId, courseBId]));
      await db.delete(users).where(inArray(users.id, [teacherAId, teacherBId, studentSId, studentS2Id, studentS3Id]));
    } catch {
      // ignore
    }
    process.exit(1);
  }
}

runTests();