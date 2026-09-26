"use client";

import { useTranslations } from "@/i18n/client";

interface ExamQuestionListItemProps {
  position: number;
  marks: number;
  questionText: string;
  optionCount: number;
  correctCount: number;
  selected: boolean;
  editable: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

/**
 * R0 §4.2: a single row in the exam-builder's question list sidebar.
 * Pure presentation + a tiny set of click handlers from the parent.
 */
export function ExamBuilderQuestionCard({
  position,
  marks,
  questionText,
  optionCount,
  correctCount,
  selected,
  editable,
  isFirst,
  isLast,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
}: ExamQuestionListItemProps) {
  const { t, tn } = useTranslations();

  const isOptionCountValid = optionCount >= 2;
  const isCorrectValid = correctCount === 1;
  const hasWarning = !isOptionCountValid || !isCorrectValid;

  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col rounded-xl border p-3 transition-all cursor-pointer ${
        selected
          ? "border-primary bg-primary/5 shadow-2xs"
          : "border-outline-variant bg-surface-container-lowest hover:border-outline hover:bg-surface-container-low/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              selected
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-secondary"
            }`}
          >
            {position}
          </span>
          <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-semibold text-secondary">
            {tn("common.markCountLower", marks)}
          </span>
        </div>

        {editable ? (
          <div
            className="flex items-center gap-1 opacity-80 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={isFirst}
              onClick={onMoveUp}
              title={t("teacher.builder.moveUp")}
              className="rounded p-1 text-secondary hover:bg-surface-container hover:text-on-surface disabled:opacity-30 cursor-pointer"
            >
              <svg
        className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={onMoveDown}
              title={t("teacher.builder.moveDown")}
              className="rounded p-1 text-secondary hover:bg-surface-container hover:text-on-surface disabled:opacity-30 cursor-pointer"
            >
              <svg
        className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onDelete}
              title={t("teacher.qe.deleteQuestion")}
              className="rounded p-1 text-secondary hover:bg-error-container/50 hover:text-error cursor-pointer"
            >
              <svg
        className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      <p className="mt-2 line-clamp-2 text-xs font-medium text-on-surface">
        {questionText}
      </p>

      <div className="mt-2 flex items-center justify-between text-[11px] text-secondary">
        <span>{tn("common.optionCountLower", optionCount)}</span>
        {hasWarning ? (
          <span
            className="flex items-center gap-1 font-semibold text-amber-700"
            title={
              !isOptionCountValid
                ? t("teacher.examBuilder.needTwoOptions")
                : correctCount === 0
                  ? t("teacher.examBuilder.noCorrectAnswer")
                  : t("teacher.examBuilder.multipleCorrectAnswers")
            }
          >
            <svg
        className="h-3.5 w-3.5 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {t("teacher.examBuilder.needsAttention")}
          </span>
        ) : (
          <span className="flex items-center gap-1 font-medium text-emerald-700">
            <svg
        className="h-3.5 w-3.5 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {t("teacher.examBuilder.valid")}
          </span>
        )}
      </div>
    </div>
  );
}
