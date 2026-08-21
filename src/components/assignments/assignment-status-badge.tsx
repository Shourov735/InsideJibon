import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import type { Assignment, AssignmentSubmission } from "@/db/schema";

export type AssignmentBadgeType =
  | Assignment["status"] // "draft" | "published" | "closed"
  | AssignmentSubmission["status"] // "not_submitted" | "draft" | "submitted" | "graded"
  | "late"
  | "on_time";

interface AssignmentStatusBadgeProps {
  status: AssignmentBadgeType;
  label?: string;
  isLate?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function AssignmentStatusBadge({
  status,
  label,
  isLate = false,
  size = "md",
  className,
}: AssignmentStatusBadgeProps) {
  const { t } = useTranslations();

  // If marked late and submitted, we can style accordingly
  const effectiveStatus = isLate && status === "submitted" ? "late" : status;

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs";

  const defaultLabel = (() => {
    switch (effectiveStatus) {
      case "draft":
        return t("common.status.draft");
      case "published":
        return t("common.status.published");
      case "closed":
        return t("common.status.closed");
      case "not_submitted":
        return t("common.status.notSubmitted");
      case "submitted":
        return t("common.status.submitted");
      case "late":
        return t("common.status.late");
      case "graded":
        return t("common.status.graded");
      case "on_time":
        return t("common.status.onTime");
      default:
        return status;
    }
  })();

  const styles: Record<string, string> = {
    draft: "bg-surface-container-highest text-on-surface-variant border-outline-variant",
    published: "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium",
    closed: "bg-slate-100 text-slate-700 border-slate-300 font-medium",
    not_submitted: "bg-surface-container-high text-secondary border-outline-variant",
    submitted: "bg-primary-container/20 text-primary border-primary/30 font-medium",
    late: "bg-amber-50 text-amber-800 border-amber-300 font-medium",
    graded: "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium",
    on_time: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const icons: Record<string, React.ReactNode> = {
    published: (
      <svg className="h-3 w-3 mr-1 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    draft: (
      <svg className="h-3 w-3 mr-1 shrink-0 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    closed: (
      <svg className="h-3 w-3 mr-1 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    late: (
      <svg className="h-3 w-3 mr-1 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    graded: (
      <svg className="h-3 w-3 mr-1 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    submitted: (
      <svg className="h-3 w-3 mr-1 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border uppercase tracking-wider font-semibold",
        sizeClasses,
        styles[effectiveStatus] ?? styles.draft,
        className
      )}
    >
      {icons[effectiveStatus]}
      <span>{label ?? defaultLabel}</span>
    </span>
  );
}
