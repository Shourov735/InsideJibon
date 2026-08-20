import type {
  Exam,
  ExamAnswer,
  ExamAttempt,
  ExamQuestion,
  ExamStatus,
  NewExam,
  NewExamAnswer,
  NewExamAttempt,
  NewExamQuestion,
  NewQuestion,
  NewQuestionOption,
  Question,
  QuestionOption,
} from "@/db/schema";

export type {
  Exam,
  ExamAnswer,
  ExamAttempt,
  ExamQuestion,
  ExamStatus,
  NewExam,
  NewExamAnswer,
  NewExamAttempt,
  NewExamQuestion,
  NewQuestion,
  NewQuestionOption,
  Question,
  QuestionOption,
};

/**
 * A question inside an exam, with the per-exam position and marks from the
 * exam_questions link joined in.
 */
export interface ExamQuestionWithDetails extends Question {
  position: number;
  marks: number;
  options: QuestionOption[];
}

/**
 * A full exam with its ordered questions and options — the payload for the
 * teacher question builder and the teacher-side preview.
 */
export interface ExamWithQuestions extends Exam {
  questions: ExamQuestionWithDetails[];
  totalMarks: number;
}

/** Exam row plus its question count for list views. */
export interface ExamWithQuestionCount extends Exam {
  questionCount: number;
}

/** Result of the authoritative publish-precondition check. */
export interface ExamPublishValidationResult {
  canPublish: boolean;
  errors: string[];
}

/** Sanitized publish status exposed to the UI. */
export interface ExamPublishCheck {
  canPublish: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Student attempt domain (Phase 4)
// ---------------------------------------------------------------------------

/**
 * Immutable snapshot of one question as the student saw it at attempt start.
 * Stored inside the attempt's contentSnapshot (server-side only) and used for
 * grading and result rendering — teacher edits can never change history.
 */
export interface ExamSnapshotOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
  position: number;
}

export interface ExamSnapshotQuestion {
  id: string;
  questionType: string;
  questionText: string;
  explanation: string | null;
  marks: number;
  position: number;
  options: ExamSnapshotOption[];
}

/**
 * The full exam content snapshotted onto an attempt when it starts. Versioned
 * so future phases can migrate old snapshots if the shape evolves.
 */
export interface ExamContentSnapshot {
  version: 1;
  examId: string;
  examTitle: string;
  courseId: string;
  durationMinutes: number | null;
  totalMarks: number;
  questions: ExamSnapshotQuestion[];
}

/** One question as returned to the student's screen BEFORE submission. */
export interface ExamTakingQuestion {
  id: string;
  questionType: string;
  questionText: string;
  marks: number;
  position: number;
  options: Array<Pick<ExamSnapshotOption, "id" | "optionText" | "position">>;
}

/** Payload of a started or resumed attempt (never contains correct answers). */
export interface StartedAttempt {
  attemptId: string;
  attemptNumber: number;
  startedAt: string;
  durationMinutes: number | null;
  courseId: string;
  totalMarks: number;
  questions: ExamTakingQuestion[];
}

/** A published exam in the student's course exam list, with their stats. */
export interface StudentCourseExam {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  maxAttempts: number | null;
  status: string;
  publishedAt: string | null;
  questionCount: number;
  totalMarks: number;
  attemptsUsed: number;
  bestPercentage: number | null;
  inProgressAttemptId: string | null;
}

/** Summary of one of the student's attempts (no answers yet). */
export interface StudentAttemptSummary {
  id: string;
  attemptNumber: number;
  status: "in_progress" | "submitted";
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  totalPoints: number | null;
  percentage: number | null;
}

/** The exam intro/detail page payload for a student (no correct answers). */
export interface StudentExamDetail {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  maxAttempts: number | null;
  status: string;
  questionCount: number;
  totalMarks: number;
  attemptsUsed: number;
  attempts: StudentAttemptSummary[];
  inProgressAttemptId: string | null;
}

/** Per-question result of a submitted attempt. */
export interface AttemptQuestionResult {
  questionId: string;
  questionText: string;
  explanation: string | null;
  marks: number;
  position: number;
  options: ExamSnapshotOption[];
  selectedOptionId: string | null;
  correctOptionId: string | null;
  awardedPoints: number;
  isCorrect: boolean;
}

/** Full result payload returned after submission and for the result page. */
export interface AttemptResult {
  attemptId: string;
  attemptNumber: number;
  examId: string;
  examTitle: string;
  courseId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  startedAt: string;
  submittedAt: string;
  questions: AttemptQuestionResult[];
}

/** Payload returned by submitExam (same as AttemptResult, minus full review). */
export interface SubmittedExamResult {
  attemptId: string;
  attemptNumber: number;
  examId: string;
  courseId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  submittedAt: string;
  answers: Array<{
    questionId: string;
    selectedOptionId: string | null;
    isCorrect: boolean;
    awardedPoints: number;
  }>;
}