import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

interface DeadlineBadgeProps {
  dueAt: Date | string | null;
  isClosed?: boolean;
  size?: "sm" | "md";
  className?: string;
  showExactDate?: boolean;
}

export function DeadlineBadge({
  dueAt,
  isClosed = false,
  size = "md",
  className,
  showExactDate = false,
}: DeadlineBadgeProps) {
  const { t, locale } = useTranslations();

  const dueDate = useMemo(() => {
    if (!dueAt) return null;
    return typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  }, [dueAt]);

  const { state, timeLabel, exactFormatted } = useMemo(() => {
    if (isClosed) {
      return { state: "closed", timeLabel: t("deadline.closed"), exactFormatted: null };
    }
    if (!dueDate || isNaN(dueDate.getTime())) {
      return { state: "none", timeLabel: t("deadline.noDeadline"), exactFormatted: null };
    }

    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const exactFormatted = new Intl.DateTimeFormat(
      locale === "bn" ? "bn-BD" : "en-US",
      {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    ).format(dueDate);

    if (diffMs <= 0) {
      return { state: "overdue", timeLabel: t("deadline.overdue"), exactFormatted };
    }

    if (diffHours < 24) {
      const hoursLeft = Math.max(1, Math.floor(diffHours));
      const hoursStr =
        locale === "bn"
          ? `${hoursLeft} ঘণ্টা`
          : `${hoursLeft}h`;
      return {
        state: "due_soon",
        timeLabel: t("deadline.dueSoon", { time: hoursStr }),
        exactFormatted,
      };
    }

    if (diffDays === 1) {
      return { state: "due_today", timeLabel: t("deadline.dueToday"), exactFormatted };
    }

    const daysStr =
      locale === "bn"
        ? `${diffDays} দিন`
        : `${diffDays}d`;

    return {
      state: "upcoming",
      timeLabel: t("deadline.upcoming", { time: daysStr }),
      exactFormatted,
    };
  }, [dueDate, isClosed, locale, t]);

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs";

  const styles: Record<string, string> = {
    none: "bg-surface-container-high text-secondary border-outline-variant",
    closed: "bg-slate-100 text-slate-600 border-slate-300",
    upcoming: "bg-surface-container-low text-secondary border-outline-variant",
    due_today: "bg-amber-50 text-amber-800 border-amber-300 font-semibold",
    due_soon: "bg-amber-100 text-amber-900 border-amber-400 font-bold animate-pulse",
    overdue: "bg-error-container/60 text-on-error-container border-error/30 font-semibold",
  };

  const icons: Record<string, React.ReactNode> = {
    none: (
      <svg className="h-3 w-3 mr-1 shrink-0 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    closed: (
      <svg className="h-3 w-3 mr-1 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    upcoming: (
      <svg className="h-3 w-3 mr-1 shrink-0 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    due_today: (
      <svg className="h-3 w-3 mr-1 shrink-0 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    due_soon: (
      <svg className="h-3 w-3 mr-1 shrink-0 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    overdue: (
      <svg className="h-3 w-3 mr-1 shrink-0 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center rounded-full border tracking-wide font-medium",
          sizeClasses,
          styles[state] ?? styles.upcoming
        )}
      >
        {icons[state]}
        <span>{timeLabel}</span>
      </span>
      {showExactDate && exactFormatted && (
        <span className="text-[11px] text-secondary">
          ({exactFormatted})
        </span>
      )}
    </div>
  );
}
