"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AttemptResult } from "@/types/exam";

interface ExamResultViewProps {
  result: AttemptResult;
  courseId: string;
}

export function ExamResultView({ result, courseId }: ExamResultViewProps) {
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "unanswered">("all");

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(result.submittedAt));
  }, [result.submittedAt]);

  const stats = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    for (const q of result.questions) {
      if (q.selectedOptionId == null) {
        unanswered++;
      } else if (q.isCorrect) {
        correct++;
      } else {
        incorrect++;
      }
    }

    return {
      total: result.questions.length,
      correct,
      incorrect,
      unanswered,
    };
  }, [result.questions]);

  // Performance classification
  const performance = useMemo(() => {
    const p = result.percentage;
    if (p >= 90) {
      return {
        label: "Outstanding (অসাধারণ)",
        badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
        barBg: "bg-emerald-600",
      };
    }
    if (p >= 75) {
      return {
        label: "Excellent (চমৎকার)",
        badgeBg: "bg-blue-100 text-blue-900 border-blue-300",
        barBg: "bg-primary",
      };
    }
    if (p >= 60) {
      return {
        label: "Good Pass (ভালো)",
        badgeBg: "bg-indigo-100 text-indigo-900 border-indigo-300",
        barBg: "bg-indigo-600",
      };
    }
    if (p >= 40) {
      return {
        label: "Passed (উত্তীর্ণ)",
        badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
        barBg: "bg-amber-600",
      };
    }
    return {
      label: "Needs Improvement (পুনর্বিবেচনা প্রয়োজন)",
      badgeBg: "bg-error-container text-on-error-container border-error/30",
      barBg: "bg-error",
    };
  }, [result.percentage]);

  const filteredQuestions = useMemo(() => {
    return result.questions.filter((q) => {
      if (filter === "correct") return q.isCorrect;
      if (filter === "incorrect") return !q.isCorrect && q.selectedOptionId != null;
      if (filter === "unanswered") return q.selectedOptionId == null;
      return true;
    });
  }, [result.questions, filter]);

  return (
    <div className="space-y-8">
      {/* Primary Scorecard Card */}
      <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-10 shadow-sm space-y-6 text-center">
        {/* Header meta */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
          <span>Attempt {result.attemptNumber}</span>
          <span>•</span>
          <span>Submitted on {formattedDate}</span>
        </div>

        {/* Big Score Display */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-3">
            <span className="text-5xl sm:text-6xl font-black tracking-tight text-primary">
              {result.percentage}%
            </span>
          </div>

          <div>
            <span
              className={`inline-block rounded-full border px-3 py-1 text-xs font-bold ${performance.badgeBg}`}
            >
              {performance.label}
            </span>
          </div>

          <p className="text-sm font-medium text-on-surface pt-1">
            <strong>{result.score}</strong> out of <strong>{result.totalPoints}</strong> marks awarded
          </p>
        </div>

        {/* Score Progress Bar */}
        <div className="mx-auto max-w-md">
          <div className="h-3 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className={`h-full rounded-full transition-all duration-500 ${performance.barBg}`}
              style={{ width: `${Math.min(100, Math.max(0, result.percentage))}%` }}
            />
          </div>
        </div>

        {/* Breakdown Metric Pills */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-2xl mx-auto pt-2">
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
              Total Questions
            </span>
            <p className="mt-0.5 text-lg font-bold text-on-surface">{stats.total}</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Correct
            </span>
            <p className="mt-0.5 text-lg font-extrabold text-emerald-700">{stats.correct}</p>
          </div>

          <div className="rounded-xl border border-error-container bg-error-container/30 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-error">
              Incorrect
            </span>
            <p className="mt-0.5 text-lg font-extrabold text-error">{stats.incorrect}</p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
              Unanswered
            </span>
            <p className="mt-0.5 text-lg font-bold text-secondary">{stats.unanswered}</p>
          </div>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-outline-variant/60">
          <Link
            href={`/student/courses/${courseId}/exams/${result.examId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
          >
            <span>Back to Exam Details</span>
          </Link>

          <Link
            href={`/student/courses/${courseId}/exams`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container hover:text-primary transition-colors"
          >
            <span>All Course Exams</span>
          </Link>

          <Link
            href={`/student/courses/${courseId}/learn`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <span>Return to Lessons</span>
          </Link>
        </div>
      </div>

      {/* Answer Review Section */}
      <div className="space-y-5">
        {/* Section Header & Filter Tabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-on-surface">
              Detailed Answer Review
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Review your answers, correct options, and detailed educational explanations below.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === "all"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setFilter("correct")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === "correct"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              Correct ({stats.correct})
            </button>
            <button
              type="button"
              onClick={() => setFilter("incorrect")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === "incorrect"
                  ? "bg-error text-on-error shadow-xs"
                  : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              Incorrect ({stats.incorrect})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unanswered")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === "unanswered"
                  ? "bg-secondary text-on-secondary shadow-xs"
                  : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              Unanswered ({stats.unanswered})
            </button>
          </div>
        </div>

        {/* Question Cards List */}
        {filteredQuestions.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-sm text-secondary">
            No questions in this filter view.
          </div>
        ) : (
          <div className="space-y-5">
            {filteredQuestions.map((q) => {
              const isUnanswered = q.selectedOptionId == null;

              return (
                <div
                  key={q.questionId}
                  className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-7 shadow-xs space-y-4"
                >
                  {/* Top Bar: Position, Prompt, Marks Score */}
                  <div className="flex items-start justify-between gap-4 border-b border-outline-variant pb-3">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                        {q.position}
                      </span>
                      <h3 className="font-semibold text-sm sm:text-base text-on-surface leading-relaxed whitespace-pre-wrap">
                        {q.questionText}
                      </h3>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-xs font-bold ${
                          q.isCorrect
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        {q.awardedPoints} / {q.marks} {q.marks === 1 ? "Mark" : "Marks"}
                      </span>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2.5 pt-1">
                    {q.options.map((option, optIdx) => {
                      const isSelected = option.id === q.selectedOptionId;
                      const isCorrectAnswer = option.id === q.correctOptionId;
                      const letter = String.fromCharCode(65 + optIdx);

                      let containerStyle =
                        "border-outline-variant bg-surface-container-lowest text-on-surface-variant";
                      let badgeStyle = "bg-surface-container-high text-secondary";

                      if (isCorrectAnswer) {
                        containerStyle =
                          "border-2 border-emerald-400 bg-emerald-50/80 text-emerald-950 font-medium shadow-2xs";
                        badgeStyle = "bg-emerald-600 text-white";
                      } else if (isSelected && !q.isCorrect) {
                        containerStyle =
                          "border-2 border-red-300 bg-red-50/80 text-red-950 font-medium shadow-2xs";
                        badgeStyle = "bg-red-600 text-white";
                      }

                      return (
                        <div
                          key={option.id}
                          className={`flex items-center gap-3 rounded-xl border p-3.5 text-xs sm:text-sm transition-colors ${containerStyle}`}
                        >
                          {/* Letter Badge */}
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${badgeStyle}`}
                          >
                            {letter}
                          </span>

                          {/* Option text */}
                          <span className="flex-1 leading-relaxed break-words">{option.optionText}</span>

                          {/* Tags */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isSelected && isCorrectAnswer && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                                ✓ Your Correct Answer
                              </span>
                            )}
                            {isSelected && !isCorrectAnswer && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-900">
                                ✗ Your Answer
                              </span>
                            )}
                            {!isSelected && isCorrectAnswer && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                                ✓ Correct Answer
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {isUnanswered && (
                      <div className="rounded-lg bg-surface-container-low p-2.5 text-xs text-secondary italic">
                        Not answered — 0 marks awarded.
                      </div>
                    )}
                  </div>

                  {/* Instructor Explanation Box */}
                  {q.explanation && (
                    <div className="rounded-xl border border-secondary-container bg-secondary-container/30 p-4 text-xs leading-relaxed text-on-secondary-container space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-primary">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Explanation & Solution Guide:</span>
                      </div>
                      <p className="pl-5 text-on-surface whitespace-pre-wrap">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
