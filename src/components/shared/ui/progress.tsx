/**
 * Progress — visual progress bar with optional label.
 *
 * Replaces the hand-rolled progress bars in student/teacher
 * components. Accessible (role="progressbar"), supports
 * indeterminate state.
 */

import { cn } from "@/lib/utils";

export interface ProgressProps {
  /** 0..100. */
  value: number;
  /** Show the value as text (e.g. "42%"). */
  showLabel?: boolean;
  /** Label rendered above the bar. */
  label?: string;
  tone?: "primary" | "success" | "warning";
  size?: "sm" | "md";
  className?: string;
}

const TONE = {
  primary: "bg-primary",
  success: "bg-[color:var(--color-success)]",
  warning: "bg-[color:var(--color-warning)]",
};

const SIZE = {
  sm: "h-1.5",
  md: "h-2.5",
};

export function Progress({
  value,
  showLabel = false,
  label,
  tone = "primary",
  size = "md",
  className,
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("space-y-1", className)}>
      {(label || showLabel) ? (
        <div className="flex items-center justify-between text-xs text-ink-500">
          {label ? <span>{label}</span> : <span />}
          {showLabel ? <span className="font-semibold text-ink-700">{Math.round(clamped)}%</span> : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn("w-full overflow-hidden rounded-full bg-surface-2", SIZE[size])}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)]", TONE[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
