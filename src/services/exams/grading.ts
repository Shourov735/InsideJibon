import "server-only";

import type { ExamContentSnapshot } from "@/types/exam";
import type { SubmittedAnswer } from "@/schemas/exam-attempt";

/**
 * Authoritative server-side grading for MCQ answers.
 *
 * Grading reads ONLY the attempt's content snapshot — the exact questions and
 * correct options the student saw at attempt start — never live question
 * rows, so later teacher edits cannot change historical results. The client
 * can preview nothing: score, per-question awarded points and correctness are
 * all computed here and persisted by the caller.
 */

export class ExamInvalidAnswerError extends Error {
  constructor() {
    super("Your submission contains an invalid answer.");
  }
}

export interface GradedAnswer {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
  awardedPoints: number;
}

export interface GradingResult {
  answers: GradedAnswer[];
  score: number;
  totalPoints: number;
  percentage: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Grades the submitted answers against the snapshot. Throws
 * ExamInvalidAnswerError when an answer references a question or option that
 * is not in the snapshot, or answers the same question twice. Unanswered
 * questions earn 0 points (partial submissions are accepted).
 */
export function gradeAnswers(
  snapshot: ExamContentSnapshot,
  answers: SubmittedAnswer[]
): GradingResult {
  const questionsById = new Map(snapshot.questions.map((q) => [q.id, q]));
  const correctOptionByQuestion = new Map<string, string | null>();
  for (const q of snapshot.questions) {
    const correct = q.options.find((o) => o.isCorrect);
    correctOptionByQuestion.set(q.id, correct?.id ?? null);
  }

  const seen = new Set<string>();
  for (const answer of answers) {
    if (seen.has(answer.questionId)) {
      throw new ExamInvalidAnswerError();
    }
    seen.add(answer.questionId);

    const question = questionsById.get(answer.questionId);
    if (!question) throw new ExamInvalidAnswerError();
    if (!question.options.some((o) => o.id === answer.selectedOptionId)) {
      throw new ExamInvalidAnswerError();
    }
  }

  const answersByQuestion = new Map(answers.map((a) => [a.questionId, a]));
  const totalPoints = snapshot.questions.reduce((sum, q) => sum + q.marks, 0);

  const graded = snapshot.questions.map((question): GradedAnswer => {
    const answer = answersByQuestion.get(question.id);
    const selectedOptionId = answer?.selectedOptionId ?? null;
    const isCorrect =
      selectedOptionId != null &&
      selectedOptionId === correctOptionByQuestion.get(question.id);
    return {
      questionId: question.id,
      selectedOptionId,
      isCorrect,
      awardedPoints: isCorrect ? question.marks : 0,
    };
  });

  const score = graded.reduce((sum, g) => sum + g.awardedPoints, 0);
  const percentage = totalPoints > 0 ? round2((score / totalPoints) * 100) : 0;

  return { answers: graded, score, totalPoints, percentage };
}