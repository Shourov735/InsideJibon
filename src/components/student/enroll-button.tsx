"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { enrollInCourseAction } from "@/app/student/actions";
import { useTranslations } from "@/i18n/client";
import { getWhatsAppEnrollmentUrl } from "@/lib/whatsapp";
import { formatBDT } from "@/lib/utils";

type EnrollmentUiStatus = "none" | "pending" | "active" | "rejected";

interface EnrollButtonProps {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  canEnroll: boolean;
  enrollmentStatus: EnrollmentUiStatus;
  priceBdt?: string | number | null;
}

/**
 * Enrollment CTA for the public course detail page. Server components pass
 * the verified enrollment state; this client component only sends the
 * courseId — the authenticated student's identity comes from the session.
 *
 * Flow:
 * 1. Visitor -> "Sign in to Request Enrollment" (preserves destination).
 * 2. Student -> "Request Enrollment".
 * 3. Pending -> Status badge + direct WhatsApp action (01865161244) with pre-filled message.
 * 4. Active -> "Continue Learning".
 */
export function EnrollButton({
  courseId,
  courseSlug,
  courseTitle,
  canEnroll,
  enrollmentStatus,
  priceBdt,
}: EnrollButtonProps) {
  const router = useRouter();
  const { t, locale } = useTranslations();
  const [status, setStatus] = useState<EnrollmentUiStatus>(enrollmentStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericPrice = priceBdt ? Number(priceBdt) : null;
  const whatsAppUrl = getWhatsAppEnrollmentUrl(courseTitle, locale, numericPrice);

  if (!canEnroll) {
    return (
      <div className="flex w-full flex-col items-stretch gap-2">
        <Link
          href={`/sign-in?redirect_url=${encodeURIComponent(`/courses/${courseSlug}`)}`}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
        >
          {t("marketing.courseDetail.signInToEnroll")}
        </Link>
        <p className="text-xs text-secondary text-center">
          {t("marketing.courseDetail.enrollHint")}
        </p>
      </div>
    );
  }

  if (status === "active") {
    return (
      <Link
        href={`/student/courses/${courseId}/learn`}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
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
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 max-w-md w-full">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
            {t("marketing.courseDetail.enrollmentPending")}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-secondary">
          {locale === "bn"
            ? `আপনার আবেদনটি গ্রহণ করা হয়েছে। কোর্স ফি (${numericPrice ? formatBDT(numericPrice) : "১,০০০ ৳"}) প্রদান ও দ্রুত অ্যাক্সেস পেতে WhatsApp-এ মেসেজ পাঠান। শিক্ষক বা অ্যাডমিন পেমেন্ট যাচাই করে ম্যানুয়ালি আপনার কোর্স অনুমোদন করবেন।`
            : `Your enrollment request has been submitted. To complete payment (${numericPrice ? formatBDT(numericPrice) : "1,000 BDT"}) and get access, message us on WhatsApp. The teacher or admin will verify and manually approve your course.`}
        </p>

        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-xs transition-all hover:shadow-md cursor-pointer"
        >
          <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.976.58 1.992.921 3.149.921l.002-.001c3.182 0 5.768-2.587 5.769-5.766.001-3.182-2.585-5.769-5.771-5.769zm3.364 8.163c-.14.394-.809.761-1.121.808-.288.043-.665.076-1.921-.444-1.608-.665-2.651-2.296-2.73-2.402-.079-.106-.649-.864-.649-1.648 0-.784.408-1.171.554-1.332.146-.161.32-.201.427-.201.107 0 .213.001.306.006.098.005.23-.037.36.275.14.336.478 1.166.52 1.252.043.086.071.188.014.302-.057.114-.086.185-.171.285-.086.1-.18.223-.257.3-.086.086-.176.18-.076.352.1.171.444.733.953 1.186.656.585 1.209.766 1.381.852.172.086.272.072.373-.044.101-.116.434-.505.549-.678.115-.173.23-.144.388-.086.158.058 1.002.472 1.174.558.172.086.287.129.33.201.043.072.043.418-.097.812zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.957-1.399C8.423 21.493 10.153 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
          </svg>
          <span>{t("enrollment.whatsapp.contactButton")}</span>
        </a>
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
    if (res.data?.enrollment) {
      setStatus(res.data.enrollment.status);
      if (typeof window !== "undefined") {
        window.open(whatsAppUrl, "_blank", "noopener,noreferrer");
      }
    }
    router.refresh();
  };

  return (
    <div className="flex w-full flex-col items-stretch gap-2">
      <button
        type="button"
        onClick={handleRequest}
        disabled={isSubmitting}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      >
        {isSubmitting
          ? t("marketing.courseDetail.submitting")
          : status === "rejected"
            ? t("marketing.courseDetail.requestAgain")
            : numericPrice
              ? `${t("marketing.courseDetail.requestEnrollment")} — ${formatBDT(numericPrice)}`
              : t("marketing.courseDetail.requestEnrollment")}
      </button>
      {status === "rejected" && !isSubmitting && (
        <p className="text-xs font-medium text-error text-center">
          {t("marketing.courseDetail.enrollmentRejectedNote")}
        </p>
      )}
      {error && <p className="text-sm font-medium text-error text-center">{error}</p>}
      <p className="text-xs text-secondary text-center">
        {t("marketing.courseDetail.enrollHint")}
      </p>
    </div>
  );
}
