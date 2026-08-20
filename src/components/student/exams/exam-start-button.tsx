"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { startExamAction } from "@/app/student/actions";

interface ExamStartButtonProps {
  examId: string;
  label?: string;
  className?: string;
}

/**
 * Starts a new attempt for the authenticated student. The returned payload
 * (server-snapshotted exam content, no correct answers) is used to navigate
 * into the take screen.
 */
export function ExamStartButton({
  examId,
  label = "Start Exam",
  className,
}: ExamStartButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setIsSubmitting(true);
    setError(null);
    const res = await startExamAction({ examId });
    if (!res.success) {
      setError(res.error);
      setIsSubmitting(false);
      return;
    }
    router.replace(`?take=${res.data.attemptId}`);
    router.refresh();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleStart}
        disabled={isSubmitting}
        className={
          className ??
          "inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        }
      >
        {isSubmitting ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
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
            <span>Starting Examination…</span>
          </>
        ) : (
          <>
            <span>{label}</span>
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
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </>
        )}
      </button>
      {error && (
        <div className="rounded-lg border border-error/30 bg-error-container/50 px-3 py-1.5 text-xs font-semibold text-on-error-container">
          {error}
        </div>
      )}
    </div>
  );
}