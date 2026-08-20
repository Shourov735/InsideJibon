"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { submitExamAction } from "@/app/student/actions";
import type { ExamTakingQuestion } from "@/types/exam";

interface ExamTakerProps {
  courseId: string;
  examId: string;
  attemptId: string;
  questions: ExamTakingQuestion[];
  examTitle?: string;
  durationMinutes?: number | null;
  startedAt?: string;
}

export function ExamTaker({
  courseId,
  examId,
  attemptId,
  questions,
  examTitle,
  durationMinutes,
  startedAt,
}: ExamTakerProps) {
  const router = useRouter();

  // Active question index (0-indexed)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Student answer selections: questionId -> selectedOptionId
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Marked for review flags: questionId -> boolean
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});

  // UI state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isMobileNavigatorOpen, setIsMobileNavigatorOpen] = useState(false);

  // Live Timer
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(() => {
    if (durationMinutes && startedAt) {
      const endMs = new Date(startedAt).getTime() + durationMinutes * 60 * 1000;
      const nowMs = Date.now();
      return Math.max(0, Math.floor((endMs - nowMs) / 1000));
    }
    return null;
  });

  useEffect(() => {
    if (durationMinutes && startedAt) {
      const endMs = new Date(startedAt).getTime() + durationMinutes * 60 * 1000;
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
        setSecondsRemaining(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [durationMinutes, startedAt]);

  const currentQuestion = questions[currentIndex] ?? questions[0];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selections).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const currentSelectedOptionId = currentQuestion ? selections[currentQuestion.id] : undefined;
  const isCurrentMarked = currentQuestion ? Boolean(markedForReview[currentQuestion.id]) : false;

  // Format timer
  const formattedTime = useMemo(() => {
    if (secondsRemaining == null) return null;
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }, [secondsRemaining]);

  const isLowTime = secondsRemaining != null && secondsRemaining <= 900; // < 15 mins
  const isUrgentTime = secondsRemaining != null && secondsRemaining <= 300; // < 5 mins

  // Option selection
  const handleSelectOption = (optionId: string) => {
    if (!currentQuestion) return;
    setSelections((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  // Clear current selection
  const handleClearSelection = () => {
    if (!currentQuestion) return;
    setSelections((prev) => {
      const next = { ...prev };
      delete next[currentQuestion.id];
      return next;
    });
  };

  // Toggle review flag
  const handleToggleMark = () => {
    if (!currentQuestion) return;
    setMarkedForReview((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  // Submit Exam
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const answersPayload = Object.entries(selections).map(([questionId, selectedOptionId]) => ({
      questionId,
      selectedOptionId,
    }));

    const res = await submitExamAction({
      attemptId,
      answers: answersPayload,
    });

    if (!res.success) {
      setSubmitError(res.error);
      setIsSubmitting(false);
      return;
    }

    router.replace(
      `/student/courses/${courseId}/exams/${examId}/result?attempt=${attemptId}`
    );
    router.refresh();
  };

  if (totalQuestions === 0) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
        <p className="text-sm font-semibold text-on-surface">
          This examination contains no questions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)]">
      {/* Top Examination Status Header */}
      <header className="sticky top-16 z-30 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-3.5 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary shadow-xs">
            Q
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-on-surface truncate sm:text-base">
              {examTitle || "Examination Assessment"}
            </h2>
            <p className="text-xs text-secondary">
              Question {currentIndex + 1} of {totalQuestions} • {answeredCount} Answered
            </p>
          </div>
        </div>

        {/* Center / Right actions: Timer & Submit */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Timer Display */}
          {formattedTime ? (
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                isUrgentTime
                  ? "border border-error/30 bg-error-container text-on-error-container animate-pulse"
                  : isLowTime
                  ? "border border-amber-300 bg-amber-50 text-amber-900"
                  : "border border-outline-variant bg-surface-container-low text-on-surface"
              }`}
            >
              <svg
                className={`h-4 w-4 shrink-0 ${
                  isUrgentTime ? "text-error" : isLowTime ? "text-amber-700" : "text-primary"
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
              <span>{formattedTime} remaining</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-medium text-secondary">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Untimed</span>
            </div>
          )}

          {/* Mark for review header button */}
          <button
            type="button"
            onClick={handleToggleMark}
            title={isCurrentMarked ? "Unmark question" : "Mark question for review"}
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
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
            <span>{isCurrentMarked ? "Marked" : "Flag"}</span>
          </button>

          {/* Submit Button */}
          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container cursor-pointer"
          >
            <span>Submit Exam</span>
          </button>
        </div>
      </header>

      {/* Main Two-Column Layout (Desktop) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 flex-1">
        {/* LEFT / CENTER: Question Canvas (8 cols on desktop) */}
        <main className="lg:col-span-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Question Header Card */}
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs">
              {/* Question Metadata */}
              <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                    {currentQuestion.position}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                    Question {currentIndex + 1} of {totalQuestions}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-surface-container-high px-2.5 py-1 text-xs font-semibold text-secondary">
                    {currentQuestion.marks} {currentQuestion.marks === 1 ? "Mark" : "Marks"}
                  </span>

                  {isCurrentMarked && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                      Marked for Review
                    </span>
                  )}
                </div>
              </div>

              {/* Question Prompt */}
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-semibold leading-relaxed text-on-surface whitespace-pre-wrap">
                  {currentQuestion.questionText}
                </h3>
              </div>

              {/* MCQ Options Stack */}
              <div className="space-y-3" role="radiogroup" aria-label={`Question ${currentQuestion.position} options`}>
                {currentQuestion.options.map((option, optIdx) => {
                  const isSelected = currentSelectedOptionId === option.id;
                  const letter = String.fromCharCode(65 + optIdx);

                  return (
                    <label
                      key={option.id}
                      onClick={() => handleSelectOption(option.id)}
                      className={`group relative flex items-center gap-3.5 rounded-xl border p-4 transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "border-2 border-primary bg-secondary-container/35 text-on-surface shadow-2xs"
                          : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline hover:bg-surface-container-low"
                      }`}
                    >
                      {/* Hidden Accessible Radio Input */}
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option.id}
                        checked={isSelected}
                        onChange={() => handleSelectOption(option.id)}
                        className="sr-only"
                      />

                      {/* Custom Academic Radio Indicator */}
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-on-primary"
                            : "border-outline-variant bg-surface-container-lowest group-hover:border-primary/60"
                        }`}
                      >
                        {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>

                      {/* Letter Identifier (A, B, C, D) */}
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                          isSelected
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-high text-secondary group-hover:bg-surface-container-highest"
                        }`}
                      >
                        {letter}
                      </span>

                      {/* Option Text */}
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
                  onClick={handleToggleMark}
                  className={`inline-flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ${
                    isCurrentMarked
                      ? "text-amber-800 hover:text-amber-900"
                      : "text-secondary hover:text-on-surface"
                  }`}
                >
                  <svg
                    className="h-4 w-4"
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
                  <span>{isCurrentMarked ? "Remove Flag" : "Mark for Review"}</span>
                </button>

                {currentSelectedOptionId && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="inline-flex items-center gap-1 font-semibold text-secondary hover:text-error transition-colors cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Clear Selection</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-5 py-2.5 text-xs font-bold text-on-surface shadow-2xs transition-colors hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Previous</span>
            </button>

            {/* Mobile Navigator Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileNavigatorOpen(true)}
              className="inline-flex lg:hidden items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Navigator ({answeredCount}/{totalQuestions})</span>
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container cursor-pointer"
              >
                <span>Next Question</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container cursor-pointer"
              >
                <span>Review & Submit</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            )}
          </div>
        </main>

        {/* RIGHT PANEL: Question Navigator (4 cols on desktop) */}
        <aside className="hidden lg:flex lg:col-span-4 flex-col">
          <div className="sticky top-32 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Question Navigator</h3>
              <p className="text-xs text-secondary mt-0.5">
                {answeredCount} of {totalQuestions} answered ({progressPercent}%)
              </p>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 border-y border-outline-variant/60 py-3 text-[11px]">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-xs bg-primary" />
                <span className="text-secondary font-medium">Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-xs border border-outline-variant bg-surface-container-lowest" />
                <span className="text-secondary font-medium">Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-3 w-3 items-center justify-center rounded-xs border border-amber-500 bg-amber-50 text-amber-700">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                </div>
                <span className="text-secondary font-medium">Marked ({markedCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-xs border-2 border-primary bg-primary/20" />
                <span className="text-secondary font-medium">Current</span>
              </div>
            </div>

            {/* Question Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-[420px] overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isAnswered = Boolean(selections[q.id]);
                const isCurrent = idx === currentIndex;
                const isMarked = Boolean(markedForReview[q.id]);

                let buttonStyle = "border-outline-variant bg-surface-container-lowest text-secondary hover:bg-surface-container-low hover:text-on-surface";
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
                    onClick={() => setCurrentIndex(idx)}
                    title={`Question ${idx + 1}${isAnswered ? " (Answered)" : ""}${isMarked ? " (Marked for review)" : ""}`}
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

            {/* Quick Submit CTA */}
            <div className="pt-2 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container cursor-pointer"
              >
                Submit Examination
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Slide-Over / Bottom Sheet for Question Navigator */}
      {isMobileNavigatorOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs lg:hidden">
          <div className="flex max-h-[80vh] flex-col rounded-t-3xl border-t border-outline-variant bg-surface-container-lowest p-6 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-outline-variant pb-4">
              <div>
                <h3 className="text-base font-bold text-on-surface">Question Navigator</h3>
                <p className="text-xs text-secondary mt-0.5">
                  {answeredCount} of {totalQuestions} answered ({progressPercent}%)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileNavigatorOpen(false)}
                className="rounded-lg p-2 text-secondary hover:bg-surface-container hover:text-on-surface"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-xs bg-primary" />
                  <span className="text-secondary">Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-xs border border-outline-variant bg-surface-container-lowest" />
                  <span className="text-secondary">Unanswered ({unansweredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-xs border border-amber-500 bg-amber-50 text-amber-700" />
                  <span className="text-secondary">Marked ({markedCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-xs border-2 border-primary bg-primary/20" />
                  <span className="text-secondary">Current</span>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-5 gap-2.5">
                {questions.map((q, idx) => {
                  const isAnswered = Boolean(selections[q.id]);
                  const isCurrent = idx === currentIndex;
                  const isMarked = Boolean(markedForReview[q.id]);

                  let buttonStyle = "border-outline-variant bg-surface-container-lowest text-secondary";
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
                        setCurrentIndex(idx);
                        setIsMobileNavigatorOpen(false);
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
                  setIsMobileNavigatorOpen(false);
                  setIsSubmitModalOpen(true);
                }}
                className="w-full rounded-xl bg-primary py-3 text-xs font-bold text-on-primary shadow-xs"
              >
                Submit Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION CONFIRMATION MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">Submit Examination?</h3>
                <p className="text-xs text-secondary">পরীক্ষা জমা দেওয়ার নিশ্চিতকরণ</p>
              </div>
            </div>

            {submitError && (
              <div className="rounded-xl border border-error-container bg-error-container/40 p-3.5 text-xs text-on-error-container">
                <p className="font-semibold">Submission Failed</p>
                <p className="mt-0.5">{submitError}</p>
              </div>
            )}

            {/* Answer Summary Stats */}
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-outline-variant bg-surface-container-low p-3.5 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Answered</span>
                <p className="mt-0.5 text-lg font-extrabold text-primary">{answeredCount}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Unanswered</span>
                <p className={`mt-0.5 text-lg font-extrabold ${unansweredCount > 0 ? "text-amber-700" : "text-secondary"}`}>
                  {unansweredCount}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Marked</span>
                <p className="mt-0.5 text-lg font-extrabold text-secondary">{markedCount}</p>
              </div>
            </div>

            {/* Warning notices */}
            <div className="space-y-2 text-xs text-on-surface-variant">
              {unansweredCount > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-amber-900">
                  <svg className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p>
                    You have <strong>{unansweredCount} unanswered question{unansweredCount === 1 ? "" : "s"}</strong>. Unanswered questions score 0 marks.
                  </p>
                </div>
              )}
              <p className="text-xs text-secondary">
                Once submitted, your answers are immediately graded on the server and cannot be edited.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-outline-variant pt-4">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50 cursor-pointer"
              >
                Continue Taking Exam
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Submitting & Grading…</span>
                  </>
                ) : (
                  <span>Confirm & Submit</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}