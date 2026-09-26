"use client";

import { useTranslations } from "@/i18n/client";
import { ExamTakerPaletteMobileToggle } from "./exam-taker-palette";

interface ExamTakerControlsProps {
  examTitle?: string;
  currentIndex: number;
  totalQuestions: number;
  answeredCount: number;
  isCurrentMarked: boolean;
  isLastQuestion: boolean;
  formattedTime: string | null;
  isLowTime: boolean;
  isUrgentTime: boolean;
  isUntimed: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleMark: () => void;
  onRequestSubmit: () => void;
}

/**
 * R0 §4.1: header row + bottom navigation row, extracted from the
 * orchestrator. The header carries the title, current-question chip,
 * timer, mark-for-review button, and submit button. The bottom row
 * carries prev / mobile-navigator-toggle / next-or-submit.
 *
 * Pure controlled — receives callbacks from the parent.
 */
export function ExamTakerControls({
  examTitle,
  currentIndex,
  totalQuestions,
  answeredCount,
  isCurrentMarked,
  isLastQuestion,
  formattedTime,
  isLowTime,
  isUrgentTime,
  isUntimed,
  onPrev,
  onNext,
  onToggleMark,
  onRequestSubmit,
}: ExamTakerControlsProps) {
  const { t } = useTranslations();

  return (
    <>
      {/* Top Examination Status Header */}
      <header className="sticky top-16 z-30 mb-4 sm:mb-6 rounded-2xl border border-outline-variant bg-surface-container-lowest/95 px-4 sm:px-5 py-3 shadow-xs backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary shadow-xs">
              Q{currentIndex + 1}
            </span>
            <div className="min-w-0 max-w-[140px] sm:max-w-xs md:max-w-md">
              <h2 className="text-xs sm:text-sm font-bold text-on-surface truncate">
                {examTitle || t("student.exam.assessmentFallback")}
              </h2>
              <p className="text-[11px] text-secondary truncate">
                {t("student.exam.questionProgressAnswered", {
                  current: currentIndex + 1,
                  total: totalQuestions,
                  answered: answeredCount,
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            {formattedTime ? (
              <div
                className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-colors ${
                  isUrgentTime
                    ? "border border-error/30 bg-error-container text-on-error-container animate-pulse"
                    : isLowTime
                      ? "border border-amber-300 bg-amber-50 text-amber-900"
                      : "border border-outline-variant bg-surface-container-low text-on-surface"
                }`}
              >
                <svg
        className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${
                    isUrgentTime
                      ? "text-error"
                      : isLowTime
                        ? "text-amber-700"
                        : "text-primary"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-mono">{formattedTime}</span>
              </div>
            ) : isUntimed ? (
              <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-medium text-secondary">
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{t("common.status.untimed")}</span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onToggleMark}
              title={
                isCurrentMarked
                  ? t("student.exam.unmarkQuestion")
                  : t("student.exam.markQuestionTitle")
              }
              aria-label={
                isCurrentMarked
                  ? t("student.exam.unmarkQuestion")
                  : t("student.exam.markQuestionTitle")
              }
              className={`inline-flex h-9 items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[color:var(--color-info)] focus-visible:outline-offset-2 ${
                isCurrentMarked
                  ? "border-tertiary bg-amber-50 text-amber-900 shadow-2xs"
                  : "border-outline-variant bg-surface-container-low text-secondary hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <svg
        className={`h-3.5 w-3.5 ${isCurrentMarked ? "text-amber-800" : "text-secondary"}`}
                fill={isCurrentMarked ? "currentColor" : "none"}
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
              <span className="hidden sm:inline">
                {isCurrentMarked ? t("student.exam.markedShort") : t("student.exam.flag")}
              </span>
            </button>

            <button
              type="button"
              onClick={onRequestSubmit}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 sm:px-4 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container focus-visible:outline-2 focus-visible:outline-[color:var(--color-info)] focus-visible:outline-offset-2 cursor-pointer"
            >
              <span>{t("student.exam.submitExam")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Bottom Navigation Buttons */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 pt-2">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={onPrev}
          aria-label={t("student.learn.previous")}
          className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 sm:px-5 text-xs font-bold text-on-surface shadow-2xs transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-[color:var(--color-info)] focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg
        className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>{t("student.learn.previous")}</span>
        </button>

        {/* Mobile navigator toggle button. The palette component listens
            for a global event to open the drawer. */}
        <ExamTakerPaletteMobileToggle
          answeredCount={answeredCount}
          totalQuestions={totalQuestions}
        />

        {isLastQuestion ? (
          <button
            type="button"
            onClick={onRequestSubmit}
            aria-label={t("student.exam.reviewAndSubmit")}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 sm:px-6 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container focus-visible:outline-2 focus-visible:outline-[color:var(--color-info)] focus-visible:outline-offset-2 cursor-pointer"
          >
            <span>{t("student.exam.reviewAndSubmit")}</span>
            <svg
        className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            aria-label={t("student.exam.nextQuestion")}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-3.5 sm:px-5 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container focus-visible:outline-2 focus-visible:outline-[color:var(--color-info)] focus-visible:outline-offset-2 cursor-pointer"
          >
            <span>{t("student.exam.nextQuestion")}</span>
            <svg
        className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
