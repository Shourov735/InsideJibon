import "server-only";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { isUuid } from "@/lib/utils";
import {
  courses,
  enrollments,
  examAnswers,
  examAttempts,
  examQuestions,
  exams,
  questionOptions,
  questions,
  type Exam,
} from "@/db/schema";
import type { SubmittedAnswer } from "@/schemas/exam-attempt";
import type {
  AttemptResult,
  ExamContentSnapshot,
  ExamSnapshotQuestion,
  StartedAttempt,
  StudentAttemptSummary,
  StudentCourseExam,
  StudentExamDetail,
  SubmittedExamResult,
} from "@/types/exam";
import { gradeAnswers } from "./grading";
export { ExamInvalidAnswerError } from "./grading";

/**
 * Student exam domain (Phase 4): published-exam visibility, attempt lifecycle
 * (in_progress → submitted) and server-side grading.
 *
 * Access rules (enforced here, never in the UI):
 * - the exam must be status = 'published' and its course must be published;
 * - the student must be enrolled in the course;
 * - attempts are owned by the student who started them — nobody else can
 *   read, resume or submit them;
 * - correct answers exist ONLY in the attempt's contentSnapshot, which is
 *   never returned to the client before submission.
 *
 * Concurrency without DB transactions (the Neon HTTP driver does not support
 * them): attempt numbering uses MAX+1 with a unique-constraint retry loop;
 * submission is a single atomic conditional UPDATE that only succeeds when
 * the attempt is still in_progress, owned by this student and within the
 * max-attempts limit — a concurrent or duplicate submit gets 0 rows and is
 * rejected.
 */

export class ExamAccessDeniedError extends Error {
  constructor() {
    super("Exam not accessible.");
  }
}

export class ExamAttemptNotFoundError extends Error {
  constructor() {
    super("Attempt not found.");
  }
}

export class ExamAlreadySubmittedError extends Error {
  constructor() {
    super("This attempt has already been submitted.");
  }
}

export class ExamAttemptLimitError extends Error {
  constructor() {
    super("Attempt limit reached for this exam.");
  }
}

/** Exam → published course → enrollment. Returns null when inaccessible. */
export async function verifyStudentExamAccess(
  studentId: string,
  examId: string
): Promise<{ exam: Exam } | null> {
  const db = getDb();
  if (!isUuid(examId)) return null;

  const [row] = await db
    .select({ exam: exams })
    .from(exams)
    .innerJoin(courses, eq(exams.courseId, courses.id))
    .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(exams.id, examId),
        eq(exams.status, "published"),
        eq(courses.status, "published"),
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, "active")
      )
    )
    .limit(1);

  return row ?? null;
}

/**
 * Every published exam of a course the student is enrolled in, with the
 * student's per-exam attempt stats. Returns null when the student is not
 * enrolled or the course is not published (404 semantics).
 */
export async function getStudentCourseExams(
  studentId: string,
  courseId: string
): Promise<StudentCourseExam[] | null> {
  const db = getDb();
  if (!isUuid(courseId)) return null;

  const [enrolled] = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, "active"),
        eq(courses.id, courseId),
        eq(courses.status, "published")
      )
    )
    .limit(1);
  if (!enrolled) return null;

  const examRows = await db
    .select()
    .from(exams)
    .where(and(eq(exams.courseId, courseId), eq(exams.status, "published")))
    .orderBy(desc(exams.publishedAt));

  if (examRows.length === 0) return [];

  const examIds = examRows.map((e) => e.id);
  const linkRows = await db
    .select()
    .from(examQuestions)
    .where(inArray(examQuestions.examId, examIds));

  const attemptRows = await db
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.studentId, studentId),
        inArray(examAttempts.examId, examIds)
      )
    );

  const statsByExam = new Map<
    string,
    { questionCount: number; totalMarks: number }
  >();
  for (const link of linkRows) {
    const stats = statsByExam.get(link.examId) ?? {
      questionCount: 0,
      totalMarks: 0,
    };
    stats.questionCount += 1;
    stats.totalMarks += link.marks;
    statsByExam.set(link.examId, stats);
  }

  return examRows.map((exam) => {
    const attempts = attemptRows.filter((a) => a.examId === exam.id);
    const submitted = attempts.filter((a) => a.status === "submitted");
    const best = submitted.reduce<number | null>(
      (max, a) =>
        a.percentage != null && (max == null || a.percentage > max)
          ? a.percentage
          : max,
      null
    );
    const latestInProgress =
      attempts.findLast((a) => a.status === "in_progress") ?? null;
    const stats = statsByExam.get(exam.id) ?? {
      questionCount: 0,
      totalMarks: 0,
    };
    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      durationMinutes: exam.durationMinutes,
      maxAttempts: exam.maxAttempts,
      status: exam.status,
      publishedAt: exam.publishedAt?.toISOString() ?? null,
      questionCount: stats.questionCount,
      totalMarks: stats.totalMarks,
      attemptsUsed: submitted.length,
      bestPercentage: best,
      inProgressAttemptId: latestInProgress?.id ?? null,
    };
  });
}

/**
 * The exam intro payload for a student: metadata + their attempt history.
 * Contains no answers and no correct-answer information.
 */
export async function getStudentExamDetail(
  studentId: string,
  examId: string
): Promise<StudentExamDetail | null> {
  const resolved = await verifyStudentExamAccess(studentId, examId);
  if (!resolved) return null;
  const { exam } = resolved;

  const db = getDb();
  const [statsRow] = await db
    .select({
      questionCount: count(examQuestions.id),
      totalMarks: sql<number>`COALESCE(SUM(${examQuestions.marks}), 0)::int`,
    })
    .from(examQuestions)
    .where(eq(examQuestions.examId, exam.id));

  const attemptRows = await db
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.studentId, studentId),
        eq(examAttempts.examId, exam.id)
      )
    )
    .orderBy(desc(examAttempts.attemptNumber));

  const attempts: StudentAttemptSummary[] = attemptRows.map((a) => ({
    id: a.id,
    attemptNumber: a.attemptNumber,
    status: a.status,
    startedAt: a.startedAt.toISOString(),
    submittedAt: a.submittedAt?.toISOString() ?? null,
    score: a.score,
    totalPoints: a.totalPoints,
    percentage: a.percentage,
  }));

  return {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    durationMinutes: exam.durationMinutes,
    maxAttempts: exam.maxAttempts,
    status: exam.status,
    questionCount: statsRow?.questionCount ?? 0,
    totalMarks: statsRow?.totalMarks ?? 0,
    attemptsUsed: attempts.filter((a) => a.status === "submitted").length,
    attempts,
    inProgressAttemptId:
      attempts.find((a) => a.status === "in_progress")?.id ?? null,
  };
}

/**
 * Starts a new attempt for an enrolled student on a published exam.
 * Snapshots the exact exam content the student sees and persists it on the
 * attempt — grading and results later read ONLY this snapshot.
 */
export async function startExam(
  studentId: string,
  examId: string
): Promise<StartedAttempt> {
  const resolved = await verifyStudentExamAccess(studentId, examId);
  if (!resolved) throw new ExamAccessDeniedError();
  const { exam } = resolved;

  const db = getDb();

  if (exam.maxAttempts != null) {
    const [used] = await db
      .select({ value: count() })
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.examId, exam.id),
          eq(examAttempts.studentId, studentId),
          eq(examAttempts.status, "submitted")
        )
      );
    if ((used?.value ?? 0) >= exam.maxAttempts) {
      throw new ExamAttemptLimitError();
    }
  }

  const snapshot = await buildContentSnapshot(exam);

  const attempt = await insertAttemptWithRetry(exam.id, studentId, snapshot);

  return {
    attemptId: attempt.id,
    attemptNumber: attempt.attemptNumber,
    startedAt: attempt.startedAt.toISOString(),
    durationMinutes: exam.durationMinutes,
    courseId: exam.courseId,
    totalMarks: snapshot.totalMarks,
    questions: toTakingQuestions(snapshot.questions),
  };
}

/**
 * Resumes an in-progress attempt of the authenticated student. Returns the
 * same sanitized payload as startExam (no correct answers). Used to continue
 * after a refresh or reconnect.
 */
export async function getAttemptForTaking(
  studentId: string,
  attemptId: string
): Promise<StartedAttempt | null> {
  const db = getDb();
  if (!isUuid(attemptId)) return null;

  const [attempt] = await db
    .select()
    .from(examAttempts)
    .where(
      and(eq(examAttempts.id, attemptId), eq(examAttempts.studentId, studentId))
    )
    .limit(1);
  if (!attempt || attempt.status !== "in_progress") return null;

  const snapshot = attempt.contentSnapshot as unknown as ExamContentSnapshot;

  return {
    attemptId: attempt.id,
    attemptNumber: attempt.attemptNumber,
    startedAt: attempt.startedAt.toISOString(),
    durationMinutes: snapshot.durationMinutes,
    courseId: snapshot.courseId,
    totalMarks: snapshot.totalMarks,
    questions: toTakingQuestions(snapshot.questions),
  };
}

/**
 * Submits an attempt: grades server-side against the snapshot, persists the
 * score and per-question answers, and flips the attempt to the terminal
 * 'submitted' state atomically. A duplicate, concurrent or foreign submit is
 * rejected. The submitted attempt is immutable — there is no mutation path
 * that can alter it afterwards.
 */
export async function submitExam(
  studentId: string,
  attemptId: string,
  answers: SubmittedAnswer[]
): Promise<SubmittedExamResult> {
  const db = getDb();
  if (!isUuid(attemptId)) throw new ExamAttemptNotFoundError();

  const [attempt] = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
    .limit(1);
  if (!attempt || attempt.studentId !== studentId) {
    throw new ExamAttemptNotFoundError();
  }
  if (attempt.status === "submitted") throw new ExamAlreadySubmittedError();

  const [exam] = await db
    .select()
    .from(exams)
    .where(eq(exams.id, attempt.examId))
    .limit(1);

  const snapshot = attempt.contentSnapshot as unknown as ExamContentSnapshot;
  const grading = gradeAnswers(snapshot, answers);

  const now = new Date();
  const maxAttemptsGuard =
    exam?.maxAttempts == null
      ? sql`true`
      : sql`${exam.maxAttempts} > (SELECT COUNT(*)::int FROM exam_attempts e2 WHERE e2.exam_id = ${attempt.examId} AND e2.student_id = ${studentId} AND e2.status = 'submitted' AND e2.id <> ${attempt.id})`;

  // Atomic claim: succeeds only for this student, on an in_progress attempt,
  // within the attempt limit. Concurrent duplicates get 0 rows.
  const [updated] = await db
    .update(examAttempts)
    .set({
      status: "submitted",
      submittedAt: now,
      score: grading.score,
      totalPoints: grading.totalPoints,
      percentage: grading.percentage,
      updatedAt: now,
    })
    .where(
      and(
        eq(examAttempts.id, attemptId),
        eq(examAttempts.studentId, studentId),
        eq(examAttempts.status, "in_progress"),
        maxAttemptsGuard
      )
    )
    .returning({ id: examAttempts.id });

  if (!updated) {
    const [fresh] = await db
      .select({ status: examAttempts.status })
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);
    if (fresh?.status === "submitted") throw new ExamAlreadySubmittedError();
    throw new ExamAttemptLimitError();
  }

  // Persist the graded answers (only the answered questions). The unique
  // (attempt_id, question_id) index plus ON CONFLICT DO NOTHING make this
  // idempotent under any double-write race.
  const answerRows = grading.answers
    .filter((a) => a.selectedOptionId != null)
    .map((a) => ({
      attemptId: attempt.id,
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
      awardedPoints: a.awardedPoints,
      isCorrect: a.isCorrect,
    }));
  if (answerRows.length > 0) {
    await db
      .insert(examAnswers)
      .values(answerRows)
      .onConflictDoNothing({
        target: [examAnswers.attemptId, examAnswers.questionId],
      });
  }

  return {
    attemptId: attempt.id,
    attemptNumber: attempt.attemptNumber,
    examId: attempt.examId,
    courseId: exam?.courseId ?? "",
    score: grading.score,
    totalPoints: grading.totalPoints,
    percentage: grading.percentage,
    submittedAt: now.toISOString(),
    answers: grading.answers.map((a) => ({
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
      isCorrect: a.isCorrect,
      awardedPoints: a.awardedPoints,
    })),
  };
}

/**
 * Full result review for a submitted attempt of the authenticated student.
 * Rendered from the attempt's snapshot + persisted answers — historically
 * correct even if the teacher changed the questions afterwards. Returns null
 * for foreign, missing or not-yet-submitted attempts (404 semantics).
 */
export async function getAttemptResult(
  studentId: string,
  attemptId: string
): Promise<AttemptResult | null> {
  const db = getDb();
  if (!isUuid(attemptId)) return null;

  const [attempt] = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
    .limit(1);
  if (!attempt || attempt.studentId !== studentId) return null;
  if (attempt.status !== "submitted") return null;

  const answerRows = await db
    .select()
    .from(examAnswers)
    .where(eq(examAnswers.attemptId, attempt.id));

  const answersByQuestion = new Map(
    answerRows.map((a) => [a.questionId, a])
  );

  const snapshot = attempt.contentSnapshot as unknown as ExamContentSnapshot;
  const questions = snapshot.questions.map((q) => {
    const answer = answersByQuestion.get(q.id);
    const correctOptionId =
      q.options.find((o) => o.isCorrect)?.id ?? null;
    return {
      questionId: q.id,
      questionText: q.questionText,
      explanation: q.explanation,
      marks: q.marks,
      position: q.position,
      options: q.options,
      selectedOptionId: answer?.selectedOptionId ?? null,
      correctOptionId,
      awardedPoints: answer?.awardedPoints ?? 0,
      isCorrect: answer?.isCorrect ?? false,
    };
  });

  return {
    attemptId: attempt.id,
    attemptNumber: attempt.attemptNumber,
    examId: attempt.examId,
    examTitle: snapshot.examTitle,
    courseId: snapshot.courseId,
    score: attempt.score ?? 0,
    totalPoints: attempt.totalPoints ?? snapshot.totalMarks,
    percentage: attempt.percentage ?? 0,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? "",
    questions,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Reads the live exam content and snapshots it exactly as the student sees it. */
async function buildContentSnapshot(
  exam: Exam
): Promise<ExamContentSnapshot> {
  const db = getDb();
  const links = await db
    .select()
    .from(examQuestions)
    .where(eq(examQuestions.examId, exam.id))
    .orderBy(examQuestions.position);

  const questionIds = links.map((l) => l.questionId);
  const questionRows = questionIds.length
    ? await db
        .select()
        .from(questions)
        .where(inArray(questions.id, questionIds))
    : [];
  const optionRows = questionIds.length
    ? await db
        .select()
        .from(questionOptions)
        .where(inArray(questionOptions.questionId, questionIds))
        .orderBy(questionOptions.position)
    : [];

  const questionsById = new Map(questionRows.map((q) => [q.id, q]));
  const optionsByQuestion = new Map<string, typeof optionRows>();
  for (const opt of optionRows) {
    const bucket = optionsByQuestion.get(opt.questionId) ?? [];
    bucket.push(opt);
    optionsByQuestion.set(opt.questionId, bucket);
  }

  const snapshotQuestions: ExamSnapshotQuestion[] = links.map((link) => {
    const question = questionsById.get(link.questionId)!;
    return {
      id: question.id,
      questionType: question.questionType,
      questionText: question.questionText,
      explanation: question.explanation,
      marks: link.marks,
      position: link.position,
      options: (optionsByQuestion.get(link.questionId) ?? []).map((o) => ({
        id: o.id,
        optionText: o.optionText,
        isCorrect: o.isCorrect,
        position: o.position,
      })),
    };
  });

  return {
    version: 1,
    examId: exam.id,
    examTitle: exam.title,
    courseId: exam.courseId,
    durationMinutes: exam.durationMinutes,
    totalMarks: snapshotQuestions.reduce((sum, q) => sum + q.marks, 0),
    questions: snapshotQuestions,
  };
}

/**
 * Strips everything a student must not see before submission: correct-answer
 * flags and explanations.
 */
function toTakingQuestions(
  questions: ExamSnapshotQuestion[]
): StartedAttempt["questions"] {
  return questions.map((q) => ({
    id: q.id,
    questionType: q.questionType,
    questionText: q.questionText,
    marks: q.marks,
    position: q.position,
    options: q.options.map((o) => ({
      id: o.id,
      optionText: o.optionText,
      position: o.position,
    })),
  }));
}

/**
 * Inserts the attempt with attemptNumber = MAX+1. Two concurrent starts can
 * compute the same number; the unique (exam, student, attempt_number)
 * constraint rejects the loser, which retries with the fresh MAX.
 */
async function insertAttemptWithRetry(
  examId: string,
  studentId: string,
  snapshot: ExamContentSnapshot
) {
  const db = getDb();
  for (let i = 0; i < 5; i++) {
    const [maxRow] = await db
      .select({
        max: sql<number>`COALESCE(MAX(${examAttempts.attemptNumber}), 0)::int`,
      })
      .from(examAttempts)
      .where(
        and(eq(examAttempts.examId, examId), eq(examAttempts.studentId, studentId))
      );

    const next = (maxRow?.max ?? 0) + 1;
    try {
      const [attempt] = await db
        .insert(examAttempts)
        .values({
          examId,
          studentId,
          attemptNumber: next,
          status: "in_progress",
          contentSnapshot: snapshot,
        })
        .returning();
      return attempt;
    } catch (error) {
      // Unique violation on (exam, student, attempt_number) — retry.
      if ((error as { code?: string }).code === "23505" && i < 4) continue;
      throw error;
    }
  }
  throw new Error("Could not start attempt. Please try again.");
}