"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { submitExamAction } from "@/app/student/actions";
import type { ExamTakingQuestion } from "@/types/exam";

interface ExamTakerProps {
  courseId: string;
  examId: string;
  attemptId: string;
  questions: ExamTakingQuestion[];
}

/**
 * Minimal MCQ-taking surface (functional contract only — the final design is
 * owned by Antigravity). Collects one option per question and submits the
 * attempt; the server grades it and this component navigates to the result.
 */
export function ExamTaker({
  courseId,
  examId,
  attemptId,
  questions,
}: ExamTakerProps) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answeredCount = Object.keys(selections).length;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    const res = await submitExamAction({
      attemptId,
      answers: Object.entries(selections).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      })),
    });
    if (!res.success) {
      setError(res.error);
      setIsSubmitting(false);
      return;
    }
    router.replace(
      `/student/courses/${courseId}/exams/${examId}/result?attempt=${attemptId}`
    );
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <p className="text-sm font-medium text-on-surface">
          {answeredCount} of {questions.length} answered
        </p>
        <span className="text-xs text-secondary">Grading happens on submission</span>
      </div>

      {questions.map((question) => (
        <div
          key={question.id}
          className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-semibold text-on-surface">
              <span className="mr-2 font-mono text-xs text-outline">
                Q{question.position}
              </span>
              {question.questionText}
            </h3>
            <span className="shrink-0 rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-[11px] font-semibold text-secondary">
              {question.marks} marks
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {question.options.map((option) => {
              const selected = selections[question.id] === option.id;
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                    selected
                      ? "border-primary bg-secondary-container/40 text-on-surface"
                      : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    checked={selected}
                    onChange={() =>
                      setSelections((prev) => ({
                        ...prev,
                        [question.id]: option.id,
                      }))
                    }
                    className="mt-0.5 accent-primary"
                  />
                  <span>{option.optionText}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting…" : "Submit Exam"}
        </button>
        <p className="text-xs text-secondary">
          Unanswered questions score 0. Submission is final.
        </p>
        {error && <p className="text-sm font-medium text-error">{error}</p>}
      </div>
    </div>
  );
}