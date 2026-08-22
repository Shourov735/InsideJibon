"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { decideEnrollmentAction } from "@/app/actions/enrollment-decision-actions";
import { useTranslations } from "@/i18n/client";

/**
 * Approve / reject controls for a pending enrollment request. Used on the
 * teacher course overview and the admin dashboard.
 */
export function RequestDecisionButtons({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const { t } = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const decide = (decision: "approved" | "rejected") => {
    setError(null);
    startTransition(async () => {
      const res = await decideEnrollmentAction({ enrollmentId, decision });
      if (!res.success) {
        setError(res.error ?? null);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => decide("approved")}
        disabled={isPending}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {t("enrollment.requests.approve")}
      </button>
      <button
        type="button"
        onClick={() => decide("rejected")}
        disabled={isPending}
        className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold text-secondary transition-colors hover:bg-surface-container-low hover:text-error disabled:cursor-not-allowed disabled:opacity-60"
      >
        {t("enrollment.requests.reject")}
      </button>
      {error && <span className="text-xs font-medium text-error">{error}</span>}
    </div>
  );
}
