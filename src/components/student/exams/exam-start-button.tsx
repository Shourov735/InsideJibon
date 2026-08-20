"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { startExamAction } from "@/app/student/actions";

interface ExamStartButtonProps {
  examId: string;
  label: string;
}

/**
 * Starts a new attempt for the authenticated student. The returned payload
 * (server-snapshotted exam content, no correct answers) is used to navigate
 * into the take screen.
 */
export function ExamStartButton({ examId, label }: ExamStartButtonProps) {
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
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Starting…" : label}
      </button>
      {error && <p className="text-sm font-medium text-error">{error}</p>}
    </div>
  );
}