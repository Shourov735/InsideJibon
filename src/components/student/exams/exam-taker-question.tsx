"use client";

import type { ExamTakingQuestion } from "@/types/exam";
import { useTranslations } from "@/i18n/client";

interface ExamTakerQuestionProps {
  question: ExamTakingQuestion;
  currentIndex: number;
  totalQuestions: number;
  selectedOptionId: string | undefined;
  isMarked: boolean;
  onSelect: (optionId: string) => void;
  onClear: () => void;
  onToggleMark: () => void;
}

/**
 * R0 §4.1: pure controlled component. Renders the active question's
 * prompt, options, mark-for-review toggle, and clear-selection button.
 * Does not own selection state — owner (the orchestrator) passes the
 * current selection + change handlers down.
 */
export function ExamTakerQuestion({
  question,
  currentIndex,
  totalQuestions,
  selectedOptionId,
  isMarked,
  onSelect,
  onClear,
  onToggleMark,
}: ExamTakerQuestionProps) {
  const { t, tn } = useTranslations();

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs">
      {/* Question Metadata */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
            {question.position}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-secondary">
            {t("student.exam.questionOf", {
              current: currentIndex + 1,
              total: totalQuestions,
            })}
          </span>
          {question.questionType === "true_false" && (
            <span className="rounded bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold text-secondary">
              {t("exam.questionType.trueFalse")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md bg-surface-container-high px-2.5 py-1 text-xs font-semibold text-secondary">
            {question.marks}{" "}
            {tn("student.exam.marks", question.marks)}
          </span>

          {isMarked && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              {t("student.exam.flagged")}
            </span>
          )}
        </div>
      </div>

      {/* Question Prompt */}
      <div className="mb-6">
        <h3 className="text-base sm:text-lg font-semibold leading-relaxed text-on-surface whitespace-pre-wrap">
          {question.questionText}
        </h3>
      </div>

      {/* MCQ Options Stack */}
      <div
        className="space-y-3"
        role="radiogroup"
        aria-label={t("student.exam.optionsAria", { n: question.position })}
      >
        {question.options.map((option, optIdx) => {
          const isSelected = selectedOptionId === option.id;
          const letter = String.fromCharCode(65 + optIdx);

          return (
            <label
              key={option.id}
              onClick={() => onSelect(option.id)}
              className={`group relative flex items-center gap-3.5 rounded-xl border p-4 transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "border-2 border-primary bg-secondary-container/35 text-on-surface shadow-2xs"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline hover:bg-surface-container-low"
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.id}
                checked={isSelected}
                onChange={() => onSelect(option.id)}
                className="sr-only"
              />

              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  isSelected
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant bg-surface-container-lowest group-hover:border-primary/60"
                }`}
              >
                {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>

              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                  isSelected
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-secondary group-hover:bg-surface-container-highest"
                }`}
              >
                {letter}
              </span>

              <span
                className={`flex-1 text-sm leading-relaxed ${
                  isSelected ? "font-semibold text-on-surface" : "text-on-surface-variant"
                }`}
              >
                {option.optionText}
              </span>
            </label>
          );
        })}
      </div>

      {/* In-Card Action Toolbar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-4 text-xs">
        <button
          type="button"
          onClick={onToggleMark}
          className={`inline-flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ${
            isMarked
              ? "text-amber-800 hover:text-amber-900"
              : "text-secondary hover:text-on-surface"
          }`}
        >
          <svg
            className="h-4 w-4"
            fill={isMarked ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
            />
          </svg>
          <span>
            {isMarked
              ? t("student.exam.removeFlag")
              : t("student.exam.markForReview")}
          </span>
        </button>

        {selectedOptionId && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 font-semibold text-secondary hover:text-error transition-colors cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>{t("student.exam.clearSelection")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
