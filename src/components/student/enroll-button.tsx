"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { enrollInCourseAction } from "@/app/student/actions";
import { useTranslations } from "@/i18n/client";

type EnrollmentUiStatus = "none" | "pending" | "active" | "rejected";

interface EnrollButtonProps {
  courseId: string;
  canEnroll: boolean;
  enrollmentStatus: EnrollmentUiStatus;
}

/**
 * Enrollment CTA for the public course detail page. Server components pass
 * the verified enrollment state; this client component only sends the
 * courseId — the authenticated student's identity comes from the session.
 * Enrollment is a request flow: pending until a teacher/admin approves.
 */
export function EnrollButton({
  courseId,
  canEnroll,
  enrollmentStatus,
}: EnrollButtonProps) {
  const router = useRouter();
  const { t } = useTranslations();
  const [status, setStatus] = useState<EnrollmentUiStatus>(enrollmentStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEnroll) {
    return (
      <Link
        href="/sign-in"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
      >
        {t("marketing.courseDetail.signInToEnroll")}
      </Link>
    );
  }

  if (status === "active") {
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
        {t("marketing.courseDetail.continueLearning")}
      </Link>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex flex-col items-start gap-2">
        <span className="inline-flex items-center gap-2 rounded-lg bg-surface-container-high px-6 py-3 text-sm font-semibold text-on-surface-variant">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          {t("marketing.courseDetail.enrollmentPending")}
        </span>
        <p className="text-xs text-secondary">
          {t("marketing.courseDetail.enrollmentPendingHint")}
        </p>
      </div>
    );
  }

  const handleRequest = async () => {
    setIsSubmitting(true);
    setError(null);
    const res = await enrollInCourseAction({ courseId });
    if (!res.success) {
      setError(res.error);
      setIsSubmitting(false);
      return;
    }
    if (res.data?.enrollment) setStatus(res.data.enrollment.status);
    router.refresh();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleRequest}
        disabled={isSubmitting}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? t("marketing.courseDetail.submitting")
          : status === "rejected"
            ? t("marketing.courseDetail.requestAgain")
            : t("marketing.courseDetail.requestEnrollment")}
      </button>
      {status === "rejected" && !isSubmitting && (
        <p className="text-xs font-medium text-error">
          {t("marketing.courseDetail.enrollmentRejectedNote")}
        </p>
      )}
      {error && <p className="text-sm font-medium text-error">{error}</p>}
      <p className="text-xs text-secondary">
        {t("marketing.courseDetail.enrollHint")}
      </p>
    </div>
  );
}
