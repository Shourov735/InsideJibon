"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { submitExamAction } from "@/app/student/actions";
import type { ExamTakingQuestion, ProctorSettings } from "@/types/exam";
import { useTranslations } from "@/i18n/client";

import { useExamTimer } from "./hooks/use-exam-timer";
import { useExamKeyboardNav } from "./hooks/use-exam-keyboard-nav";
import { useExamAutosave } from "./hooks/use-exam-autosave";
import { ExamTakerQuestion } from "./exam-taker-question";
import { ExamTakerPalette } from "./exam-taker-palette";
import { ExamTakerControls } from "./exam-taker-controls";
import { ProctorLobby, ProctorToolbar } from "./proctor-toolbar";

interface ExamTakerProps {
  courseId: string;
  examId: string;
  attemptId: string;
  questions: ExamTakingQuestion[];
  examTitle?: string;
  durationMinutes?: number | null;
  startedAt?: string;
  proctoring?: ProctorSettings;
}

/**
 * R0 §4.1: orchestrator. Owns the four pieces of state that drive the
 * exam UI:
 *   - `currentIndex` — active question.
 *   - `selections`   — { questionId -> optionId }.
 *   - `markedForReview` — { questionId -> boolean }.
 *   - submit modal + submitting flag + submit error.
 *
 * Render responsibilities delegated to:
 *   - <ExamTakerControls />  — header row + bottom navigation.
 *   - <ExamTakerQuestion />  — the active question card.
 *   - <ExamTakerPalette />   — desktop rail + mobile drawer.
 *
 * Hooks:
 *   - useExamTimer()        — secondsRemaining + formattedTime.
 *   - useExamKeyboardNav()   — arrow keys + number jump.
 *   - useExamAutosave()     — scaffold; no real persistence yet.
 */
export function ExamTaker({
  courseId,
  examId,
  attemptId,
  questions,
  examTitle,
  durationMinutes,
  startedAt,
  proctoring,
}: ExamTakerProps) {
  const { t, tn } = useTranslations();
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<
    Record<string, boolean>
  >({});

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [proctorLobbyAcknowledged, setProctorLobbyAcknowledged] = useState(false);

  const hasProctoring = Boolean(
    proctoring &&
      (proctoring.fullscreenRequired ||
        proctoring.tabSwitchFlag ||
        proctoring.webcamRequired)
  );

  const timer = useExamTimer(durationMinutes, startedAt);
  useExamKeyboardNav(currentIndex, questions.length, setCurrentIndex);

  // Autosave is intentionally a no-op stub for R0 — see hook for the
  // persistence seam. The serialize callback captures selections by
  // reference; it will be replaced in R9 when the autosave endpoint
  // lands.
  useExamAutosave(
    () => Object.entries(selections).map(([qid, oid]) => ({ qid, oid })),
    undefined,
    30_000
  );

  const currentQuestion = questions[currentIndex] ?? questions[0];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selections).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const markedCount = Object.values(markedForReview).filter(Boolean).length;

  const currentSelectedOptionId = currentQuestion
    ? selections[currentQuestion.id]
    : undefined;
  const isCurrentMarked = currentQuestion
    ? Boolean(markedForReview[currentQuestion.id])
    : false;

  function handleSelectOption(optionId: string) {
    if (!currentQuestion) return;
    setSelections((prev) => ({ ...prev, [currentQuestion.id]: optionId }));
  }

  function handleClearSelection() {
    if (!currentQuestion) return;
    setSelections((prev) => {
      const next = { ...prev };
      delete next[currentQuestion.id];
      return next;
    });
  }

  function handleToggleMark() {
    if (!currentQuestion) return;
    setMarkedForReview((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  }

  async function handleConfirmSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);

    const answersPayload = Object.entries(selections).map(
      ([questionId, selectedOptionId]) => ({ questionId, selectedOptionId })
    );

    const res = await submitExamAction({ attemptId, answers: answersPayload });

    if (!res.success) {
      setSubmitError(res.error);
      setIsSubmitting(false);
      return;
    }

    router.replace(
      `/student/courses/${courseId}/exams/${examId}/result?attempt=${attemptId}`
    );
    router.refresh();
  }

  if (totalQuestions === 0) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
        <p className="text-sm font-semibold text-on-surface">
          {t("student.exam.noQuestions")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] w-full">
      {hasProctoring && proctoring && !proctorLobbyAcknowledged ? (
        <ProctorLobby
          settings={proctoring}
          onContinue={() => setProctorLobbyAcknowledged(true)}
        />
      ) : null}
      {hasProctoring && proctoring && proctorLobbyAcknowledged ? (
        <ProctorToolbar attemptId={attemptId} settings={proctoring} />
      ) : null}
      <ExamTakerControls
        examTitle={examTitle}
        currentIndex={currentIndex}
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
        isCurrentMarked={isCurrentMarked}
        isLastQuestion={currentIndex >= totalQuestions - 1}
        formattedTime={timer.formattedTime}
        isLowTime={timer.isLowTime}
        isUrgentTime={timer.isUrgentTime}
        isUntimed={durationMinutes == null}
        onPrev={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
        onNext={() =>
          setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))
        }
        onToggleMark={handleToggleMark}
        onRequestSubmit={() => setIsSubmitModalOpen(true)}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 flex-1">
        <main className="lg:col-span-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {currentQuestion ? (
              <ExamTakerQuestion
                question={currentQuestion}
                currentIndex={currentIndex}
                totalQuestions={totalQuestions}
                selectedOptionId={currentSelectedOptionId}
                isMarked={isCurrentMarked}
                onSelect={handleSelectOption}
                onClear={handleClearSelection}
                onToggleMark={handleToggleMark}
              />
            ) : null}
          </div>
        </main>

        <ExamTakerPalette
          questions={questions}
          currentIndex={currentIndex}
          selections={selections}
          markedForReview={markedForReview}
          onJump={setCurrentIndex}
          onRequestSubmit={() => setIsSubmitModalOpen(true)}
        />
      </div>

      {isSubmitModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg
        className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3
                  id="submit-modal-title"
                  className="text-base font-bold text-on-surface"
                >
                  {t("student.exam.submitConfirmTitle")}
                </h3>
                <p className="text-xs text-secondary">
                  {t("student.exam.submitConfirmSubtitle")}
                </p>
              </div>
            </div>

            {submitError ? (
              <div className="rounded-xl border border-error-container bg-error-container/40 p-3.5 text-xs text-on-error-container">
                <p className="font-semibold">
                  {t("student.exam.submissionFailed")}
                </p>
                <p className="mt-0.5">{submitError}</p>
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-2 rounded-xl border border-outline-variant bg-surface-container-low p-3.5 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                  {t("student.exam.statAnswered")}
                </span>
                <p className="mt-0.5 text-lg font-extrabold text-primary">
                  {answeredCount}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                  {t("student.exam.statUnanswered")}
                </span>
                <p
                  className={`mt-0.5 text-lg font-extrabold ${
                    unansweredCount > 0 ? "text-amber-700" : "text-secondary"
                  }`}
                >
                  {unansweredCount}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                  {t("student.exam.statMarked")}
                </span>
                <p className="mt-0.5 text-lg font-extrabold text-secondary">
                  {markedCount}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-on-surface-variant">
              {unansweredCount > 0 ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-amber-900">
                  <svg
        className="h-4 w-4 shrink-0 text-amber-700 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <p>
                    {t("student.exam.unansweredWarning", {
                      count: unansweredCount,
                      questions: tn("student.exam.question", unansweredCount),
                    })}
                  </p>
                </div>
              ) : null}
              <p className="text-xs text-secondary">{t("student.exam.finalNote")}</p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-outline-variant pt-4">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50 cursor-pointer"
              >
                {t("student.exam.continueTaking")}
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <svg
        className="h-3.5 w-3.5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>{t("student.exam.submitting")}</span>
                  </>
                ) : (
                  <span>{t("student.exam.confirmSubmit")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
