"use client";

import { useEffect, useState } from "react";

import type { ExamTakingQuestion } from "@/types/exam";
import { useTranslations } from "@/i18n/client";

interface ExamTakerPaletteProps {
  questions: ExamTakingQuestion[];
  currentIndex: number;
  selections: Record<string, string>;
  markedForReview: Record<string, boolean>;
  onJump: (index: number) => void;
  onRequestSubmit: () => void;
}

/**
 * R0 §4.1: navigator palette. Renders two surfaces:
 *   - desktop: sticky right rail with the grid + legend + quick submit
 *   - mobile: bottom-sheet drawer toggled by the controls row
 *
 * Pure controlled component. The orchestrator owns selection state.
 */
export function ExamTakerPalette({
  questions,
  currentIndex,
  selections,
  markedForReview,
  onJump,
  onRequestSubmit,
}: ExamTakerPaletteProps) {
  const { t } = useTranslations();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Listen for the global "open palette" event dispatched by the
  // controls row. Namespaced so other components can't accidentally
  // trigger this drawer.
  useEffect(() => {
    function onOpen() {
      setIsMobileOpen(true);
    }
    window.addEventListener("exam-taker:open-palette", onOpen);
    return () => window.removeEventListener("exam-taker:open-palette", onOpen);
  }, []);

  const answeredCount = Object.keys(selections).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const progressPercent =
    questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  const grid = (
    <div className="grid grid-cols-5 gap-2 max-h-[420px] overflow-y-auto pr-1">
      {questions.map((q, idx) => {
        const isAnswered = Boolean(selections[q.id]);
        const isCurrent = idx === currentIndex;
        const isMarked = Boolean(markedForReview[q.id]);

        let buttonStyle =
          "border-outline-variant bg-surface-container-lowest text-secondary hover:bg-surface-container-low hover:text-on-surface";
        if (isCurrent) {
          buttonStyle = "border-2 border-primary bg-primary/10 text-primary font-bold shadow-2xs";
        } else if (isAnswered) {
          buttonStyle = "bg-primary text-on-primary border-primary font-semibold hover:opacity-90";
        } else if (isMarked) {
          buttonStyle = "border-amber-400 bg-amber-50 text-amber-900 font-semibold";
        }

        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onJump(idx)}
            title={
              t("student.exam.questionShort", { n: idx + 1 }) +
              (isAnswered ? t("student.exam.answeredSuffix") : "") +
              (isMarked ? t("student.exam.markedSuffix") : "")
            }
            className={`relative aspect-square rounded-xl border text-xs transition-all flex items-center justify-center cursor-pointer ${buttonStyle}`}
          >
            <span>{idx + 1}</span>
            {isMarked && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white">
                ★
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const legend = (
    <div className="grid grid-cols-2 gap-2 border-y border-outline-variant/60 py-3 text-[11px]">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-xs bg-primary" />
        <span className="text-secondary font-medium">
          {t("student.exam.legendAnswered", { count: answeredCount })}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-xs border border-outline-variant bg-surface-container-lowest" />
        <span className="text-secondary font-medium">
          {t("student.exam.legendUnanswered", { count: unansweredCount })}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-3 w-3 items-center justify-center rounded-xs border border-amber-500 bg-amber-50 text-amber-700">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-600" />
        </div>
        <span className="text-secondary font-medium">
          {t("student.exam.legendMarked", { count: markedCount })}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-xs border-2 border-primary bg-primary/20" />
        <span className="text-secondary font-medium">
          {t("student.exam.legendCurrent")}
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sticky rail */}
      <aside className="hidden lg:flex lg:col-span-4 flex-col">
        <div className="sticky top-32 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-on-surface">
              {t("student.exam.questionNavigator")}
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              {t("student.exam.progressAnswered", {
                answered: answeredCount,
                total: questions.length,
                percent: progressPercent,
              })}
            </p>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {legend}
          {grid}

          <div className="pt-2 border-t border-outline-variant">
            <button
              type="button"
              onClick={onRequestSubmit}
              className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container cursor-pointer"
            >
              {t("student.exam.submitExamination")}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom-sheet */}
      {isMobileOpen ? (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-navigator-title"
        >
          <div className="flex max-h-[80vh] flex-col rounded-t-3xl border-t border-outline-variant bg-surface-container-lowest p-6 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-outline-variant pb-4">
              <div>
                <h3
                  id="mobile-navigator-title"
                  className="text-base font-bold text-on-surface"
                >
                  {t("student.exam.questionNavigator")}
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  {t("student.exam.progressAnswered", {
                    answered: answeredCount,
                    total: questions.length,
                    percent: progressPercent,
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="rounded-lg p-2 text-secondary hover:bg-surface-container hover:text-on-surface"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {legend}
              <div className="grid grid-cols-5 gap-2.5">
                {questions.map((q, idx) => {
                  const isAnswered = Boolean(selections[q.id]);
                  const isCurrent = idx === currentIndex;
                  const isMarked = Boolean(markedForReview[q.id]);

                  let buttonStyle =
                    "border-outline-variant bg-surface-container-lowest text-secondary";
                  if (isCurrent) {
                    buttonStyle = "border-2 border-primary bg-primary/10 text-primary font-bold";
                  } else if (isAnswered) {
                    buttonStyle = "bg-primary text-on-primary border-primary font-semibold";
                  } else if (isMarked) {
                    buttonStyle = "border-amber-400 bg-amber-50 text-amber-900 font-semibold";
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        onJump(idx);
                        setIsMobileOpen(false);
                      }}
                      className={`relative aspect-square rounded-xl border text-sm transition-all flex items-center justify-center ${buttonStyle}`}
                    >
                      <span>{idx + 1}</span>
                      {isMarked && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white">
                          ★
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => {
                  setIsMobileOpen(false);
                  onRequestSubmit();
                }}
                className="w-full rounded-xl bg-primary py-3 text-xs font-bold text-on-primary shadow-xs"
              >
                {t("student.exam.submitExam")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * Mobile navigator toggle is rendered as a separate small control so the
 * controls row can place it inline with the other header actions. We
 * expose the parent-controlled visibility via this companion component
 * — callers render both `<ExamTakerPalette />` (the rail/sheet) and
 * `<ExamTakerPaletteMobileToggle />` (the trigger button). They share
 * no state directly; the trigger uses a ref-less approach by emitting
 * a custom event. This keeps the parent's hook count low.
 *
 * Implementation: a global custom event `exam-taker:open-palette` is
 * dispatched from the trigger; the palette listens and opens. The
 * event is intentionally namespaced to avoid clashes with other
 * components.
 */
export function ExamTakerPaletteMobileToggle({
  answeredCount,
  totalQuestions,
}: {
  answeredCount: number;
  totalQuestions: number;
}) {
  const { t } = useTranslations();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("exam-taker:open-palette"));
        }
      }}
      className="inline-flex lg:hidden items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2.5 text-xs font-semibold text-primary cursor-pointer hover:bg-surface-container"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
      <span>
        {t("student.exam.navigatorCount", {
          answered: answeredCount,
          total: totalQuestions,
        })}
      </span>
    </button>
  );
}
