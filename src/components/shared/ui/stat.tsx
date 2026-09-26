/**
 * Stat — small inline statistic tile for dashboards.
 *
 * Replaces ad-hoc "stat tiles" built inline across dashboards.
 * Renders consistently across student/teacher/admin/parent views.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  /** Optional icon next to the value. */
  icon?: ReactNode;
  /** Accent tone for the icon container. */
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  className?: string;
}

const TONE: Record<NonNullable<StatProps["tone"]>, string> = {
  neutral: "bg-surface-1 text-ink-700",
  primary: "bg-primary-container text-on-primary-container",
  success: "bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]",
  warning: "bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)]",
  danger: "bg-[color:var(--color-danger)]/12 text-[color:var(--color-danger)]",
};

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
}: StatProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-0 p-4",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="text-micro font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </div>
        <div className="font-display text-2xl font-semibold tracking-tight text-ink-900 break-words">
          {value}
        </div>
        {hint ? <div className="text-xs text-ink-500">{hint}</div> : null}
      </div>
      {icon ? (
        <div
          aria-hidden
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            TONE[tone],
          )}
        >
          {icon}
        </div>
      ) : null}
    </div>
  );
}
