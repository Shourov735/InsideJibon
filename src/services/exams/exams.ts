import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  courses,
  examQuestions,
  exams,
  questionOptions,
  questions,
  type Exam,
} from "@/db/schema";
import type {
  CreateExamInput,
  UpdateExamInput,
} from "@/schemas/exam";
import type {
  ExamPublishValidationResult,
  ExamWithQuestionCount,
  ExamWithQuestions,
} from "@/types/exam";
import {
  ExamCannotDeleteError,
  ExamLifecycleError,
  ExamNotFoundError,
  ExamPublishBlockedError,
  verifyCourseOwnership,
  verifyExamOwnership,
} from "./ownership";

/**
 * Teacher exam domain: lifecycle (draft → published → archived) and the
 * authoritative publish-precondition validation. Structural content lives in
 * ./questions.ts and ./options.ts. The exam lifecycle mirrors the course
 * lifecycle: draft = editable, published = frozen (structurally) and visible
 * to future student attempts, archived = hidden from active use.
 */

/**
 * Creates a new draft exam associated with a course the teacher owns.
 */
export async function createExam(
  teacherId: string,
  input: CreateExamInput
): Promise<Exam> {
  const course = await verifyCourseOwnership(teacherId, input.courseId);
  if (!course) throw new ExamNotFoundError();

  const db = getDb();
  const [exam] = await db
    .insert(exams)
    .values({
      courseId: input.courseId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      durationMinutes:
        input.durationMinutes == null
          ? null
          : Number(input.durationMinutes),
      maxAttempts:
        input.maxAttempts == null ? null : Number(input.maxAttempts),
      status: "draft",
    })
    .returning();

  return exam;
}

/**
 * Lists the teacher's exams, optionally scoped to one of their courses.
 */
export async function getTeacherExams(
  teacherId: string,
  courseId?: string
): Promise<ExamWithQuestionCount[]> {
  const db = getDb();
  const rows = await db
    .select({ exam: exams })
    .from(exams)
    .innerJoin(courses, eq(exams.courseId, courses.id))
    .where(
      courseId
        ? and(eq(courses.id, courseId), eq(courses.teacherId, teacherId))
        : eq(courses.teacherId, teacherId)
    )
    .orderBy(desc(exams.createdAt));

  return withQuestionCounts(rows.map((r) => r.exam));
}

/**
 * Fetches a single teacher-owned exam by ID. Returns null (never throws) so
 * callers can render 404s without revealing whether the exam exists.
 */
export async function getTeacherExamById(
  teacherId: string,
  examId: string
): Promise<Exam | null> {
  const resolved = await verifyExamOwnership(teacherId, examId);
  return resolved?.exam ?? null;
}

/**
 * Fetches an exam with its ordered questions and options — the payload for
 * the question builder and teacher-side preview. Returns null when the exam
 * is not owned by the teacher.
 */
export async function getTeacherExamWithQuestions(
  teacherId: string,
  examId: string
): Promise<ExamWithQuestions | null> {
  const resolved = await verifyExamOwnership(teacherId, examId);
  if (!resolved) return null;
  const { exam } = resolved;

  const db = getDb();
  const links = await db
    .select()
    .from(examQuestions)
    .where(eq(examQuestions.examId, exam.id))
    .orderBy(examQuestions.position);

  if (links.length === 0) {
    return { ...exam, questions: [], totalMarks: 0 };
  }

  const questionIds = links.map((l) => l.questionId);
  const questionRows = await db
    .select()
    .from(questions)
    .where(inArray(questions.id, questionIds));

  const optionRows = await db
    .select()
    .from(questionOptions)
    .where(inArray(questionOptions.questionId, questionIds))
    .orderBy(questionOptions.position);

  const questionsById = new Map(questionRows.map((q) => [q.id, q]));
  const optionsByQuestion = new Map<string, typeof optionRows>();
  for (const opt of optionRows) {
    const bucket = optionsByQuestion.get(opt.questionId) ?? [];
    bucket.push(opt);
    optionsByQuestion.set(opt.questionId, bucket);
  }

  let totalMarks = 0;
  const examQuestionsWithDetails = links.map((link) => {
    totalMarks += link.marks;
    const question = questionsById.get(link.questionId);
    return {
      ...question!,
      position: link.position,
      marks: link.marks,
      options: optionsByQuestion.get(link.questionId) ?? [],
    };
  });

  return { ...exam, questions: examQuestionsWithDetails, totalMarks };
}

/**
 * Updates exam metadata (title, description, duration). The courseId in the
 * payload must match the exam's current course — reassigning an exam to a
 * different course is not supported in this phase.
 */
export async function updateExam(
  teacherId: string,
  examId: string,
  input: UpdateExamInput
): Promise<Exam> {
  const resolved = await verifyExamOwnership(teacherId, examId);
  if (!resolved) throw new ExamNotFoundError();

  // Reject accidental course reassignment without leaking whether the exam
  // exists (same generic error as a missing exam).
  if (input.courseId !== resolved.exam.courseId) {
    throw new ExamNotFoundError();
  }

  const db = getDb();
  const [updated] = await db
    .update(exams)
    .set({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      durationMinutes:
        input.durationMinutes == null
          ? null
          : Number(input.durationMinutes),
      maxAttempts:
        input.maxAttempts == null ? null : Number(input.maxAttempts),
      updatedAt: new Date(),
    })
    .where(eq(exams.id, examId))
    .returning();

  return updated;
}

/**
 * Evaluates the publishing preconditions for an exam. This is the single
 * source of truth for "can this exam be published" — the UI renders this
 * result, and publishExam enforces it again before writing.
 */
export async function validateExamForPublishing(
  teacherId: string,
  examId: string
): Promise<ExamPublishValidationResult> {
  const examWithQuestions = await getTeacherExamWithQuestions(teacherId, examId);
  if (!examWithQuestions) {
    return {
      canPublish: false,
      errors: ["Exam does not exist or you do not have permission."],
    };
  }

  const errors: string[] = [];

  if (!examWithQuestions.title || examWithQuestions.title.trim().length < 3) {
    errors.push("Exam title must be at least 3 characters long.");
  }

  if (
    !examWithQuestions.description ||
    examWithQuestions.description.trim().length < 10
  ) {
    errors.push("Exam description must be at least 10 characters long.");
  }

  if (examWithQuestions.questions.length === 0) {
    errors.push("Exam must contain at least one question.");
  } else {
    for (const q of examWithQuestions.questions) {
      const label = `Question ${q.position}`;
      if (!q.questionText || q.questionText.trim().length < 2) {
        errors.push(`${label} must have valid question text.`);
      }
      if (q.marks < 1) {
        errors.push(`${label} must have marks of at least 1.`);
      }
      if (q.options.length < 2) {
        errors.push(
          `${label} must have at least two answer options.`
        );
        continue;
      }
      const correctCount = q.options.filter((o) => o.isCorrect).length;
      if (correctCount === 0) {
        errors.push(
          `${label} must have exactly one correct answer option (currently none are marked correct).`
        );
      } else if (correctCount > 1) {
        errors.push(
          `${label} must have exactly one correct answer option (currently ${correctCount} are marked correct).`
        );
      }
      for (const opt of q.options) {
        if (!opt.optionText || opt.optionText.trim().length === 0) {
          errors.push(`${label} has an answer option with empty text.`);
          break;
        }
      }
    }
  }

  return { canPublish: errors.length === 0, errors };
}

/**
 * Publishes an exam after full structural validation. Blocks publishing when
 * the invariants are violated, with a per-question explanation.
 */
export async function publishExam(
  teacherId: string,
  examId: string
): Promise<Exam> {
  // Ownership first: unauthorized access must behave like Not Found, never
  // run the (owner-scoped) publish validation.
  const resolved = await verifyExamOwnership(teacherId, examId);
  if (!resolved) throw new ExamNotFoundError();

  const validation = await validateExamForPublishing(teacherId, examId);
  if (!validation.canPublish) {
    throw new ExamPublishBlockedError(validation.errors);
  }

  const db = getDb();
  const [updated] = await db
    .update(exams)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(exams.id, examId))
    .returning();

  return updated;
}

/**
 * Returns a published exam to draft. Structural edits are only possible in
 * draft, so unpublishing is the way a teacher changes published content.
 */
export async function unpublishExam(
  teacherId: string,
  examId: string
): Promise<Exam> {
  const resolved = await verifyExamOwnership(teacherId, examId);
  if (!resolved) throw new ExamNotFoundError();
  if (resolved.exam.status !== "published") {
    throw new ExamLifecycleError("Exam is not currently published.");
  }

  const db = getDb();
  const [updated] = await db
    .update(exams)
    .set({
      status: "draft",
      publishedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(exams.id, examId))
    .returning();

  return updated;
}

/**
 * Archives an active exam, hiding it from active use (draft or published).
 */
export async function archiveExam(
  teacherId: string,
  examId: string
): Promise<Exam> {
  const resolved = await verifyExamOwnership(teacherId, examId);
  if (!resolved) throw new ExamNotFoundError();
  if (resolved.exam.status === "archived") {
    throw new ExamLifecycleError("Exam is already archived.");
  }

  const db = getDb();
  const [updated] = await db
    .update(exams)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(exams.id, examId))
    .returning();

  return updated;
}

/**
 * Restores an archived exam back to draft so it can be edited again.
 */
export async function restoreExam(
  teacherId: string,
  examId: string
): Promise<Exam> {
  const resolved = await verifyExamOwnership(teacherId, examId);
  if (!resolved) throw new ExamNotFoundError();
  if (resolved.exam.status !== "archived") {
    throw new ExamLifecycleError("Only archived exams can be restored.");
  }

  const db = getDb();
  const [updated] = await db
    .update(exams)
    .set({ status: "draft", updatedAt: new Date() })
    .where(eq(exams.id, examId))
    .returning();

  return updated;
}

/**
 * Permanently deletes a draft or archived exam. Published exams cannot be
 * deleted — the teacher must unpublish or archive first (mirrors the course
 * rule for published content). Question rows cascade away with the exam.
 */
export async function deleteExam(teacherId: string, examId: string): Promise<void> {
  const resolved = await verifyExamOwnership(teacherId, examId);
  if (!resolved) throw new ExamNotFoundError();
  if (resolved.exam.status === "published") {
    throw new ExamCannotDeleteError();
  }

  const db = getDb();
  await db.delete(exams).where(eq(exams.id, examId));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function withQuestionCounts(
  examRows: Exam[]
): Promise<ExamWithQuestionCount[]> {
  if (examRows.length === 0) return [];

  const db = getDb();
  const rows = await db
    .select({ examId: examQuestions.examId, questionId: examQuestions.questionId })
    .from(examQuestions)
    .where(inArray(examQuestions.examId, examRows.map((e) => e.id)));

  const countByExam = new Map<string, number>();
  for (const row of rows) {
    countByExam.set(row.examId, (countByExam.get(row.examId) ?? 0) + 1);
  }

  return examRows.map((exam) => ({
    ...exam,
    questionCount: countByExam.get(exam.id) ?? 0,
  }));
}