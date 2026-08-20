import type {
  Exam,
  ExamQuestion,
  ExamStatus,
  NewExam,
  NewExamQuestion,
  NewQuestion,
  NewQuestionOption,
  Question,
  QuestionOption,
} from "@/db/schema";

export type {
  Exam,
  ExamQuestion,
  ExamStatus,
  NewExam,
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