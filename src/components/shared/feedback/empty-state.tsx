import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * R1 §5 — Empty-state primitive.
 *
 * Replaces the ad-hoc dashed-border blocks that previously appeared
 * inside directory pages. Caller passes an optional icon (SVG/emoji),
 * a localized title + description, and an optional CTA action.
 */

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Tone affects the icon background. Defaults to neutral. */
  tone?: "neutral" | "muted" | "positive";
  className?: string;
}

const TONE_BG: Record<NonNullable<EmptyStateProps["tone"]>, string> = {
  neutral: "bg-surface-container-low",
  muted: "bg-surface-container",
  positive: "bg-[color:var(--color-success)]/10",
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "neutral",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            TONE_BG[tone],
          )}
          aria-hidden
        >
          {icon}
        </div>
      ) : null}
      <div className="space-y-1 max-w-md">
        <p className="font-display text-base font-semibold text-on-surface">{title}</p>
        {description ? <p className="text-sm text-secondary">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
