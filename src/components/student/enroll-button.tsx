"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { enrollInCourseAction } from "@/app/student/actions";

interface EnrollButtonProps {
  courseId: string;
  canEnroll: boolean;
  enrolled: boolean;
}

/**
 * Enrollment CTA for the public course detail page. Server components pass
 * the verified enrollment state; this client component only sends the
 * courseId — the authenticated student's identity comes from the session.
 */
export function EnrollButton({
  courseId,
  canEnroll,
  enrolled,
}: EnrollButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEnroll) {
    return (
      <Link
        href="/sign-in"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
      >
        Sign in to enroll
      </Link>
    );
  }

  if (enrolled) {
    return (
      <Link
        href={`/student/courses/${courseId}/learn`}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        Continue Learning
      </Link>
    );
  }

  const handleEnroll = async () => {
    setIsSubmitting(true);
    setError(null);
    const res = await enrollInCourseAction({ courseId });
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
        onClick={handleEnroll}
        disabled={isSubmitting}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Enrolling…" : "Enroll Now"}
      </button>
      {error && <p className="text-sm font-medium text-error">{error}</p>}
      <p className="text-xs text-secondary">
        You will be able to start learning immediately after enrolling.
      </p>
    </div>
  );
}