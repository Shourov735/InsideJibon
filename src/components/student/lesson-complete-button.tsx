"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { markLessonCompleteAction } from "@/app/student/actions";

interface LessonCompleteButtonProps {
  lessonId: string;
  completed: boolean;
}

/**
 * Toggles the current lesson's completed state for the authenticated
 * student. The lesson's owning course is derived server-side and the
 * student must be enrolled for the action to succeed.
 */
export function LessonCompleteButton({
  lessonId,
  completed,
}: LessonCompleteButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    setIsSubmitting(true);
    setError(null);
    const res = await markLessonCompleteAction({
      lessonId,
      completed: !completed,
    });
    if (!res.success) {
      setError(res.error);
      setIsSubmitting(false);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isSubmitting}
        className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          completed
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container"
        }`}
      >
        {completed ? (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Completed — Undo
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Mark as Complete
          </>
        )}
      </button>
      {error && <p className="text-sm font-medium text-error">{error}</p>}
    </div>
  );
}