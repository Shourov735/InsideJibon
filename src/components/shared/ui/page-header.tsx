/**
 * PageHeader — top-of-page title block.
 *
 * Use at the top of every screen to give it a consistent rhythm:
 * eyebrow (optional) → title → description → action area.
 *
 * Mobile: title shrinks, action area stacks below or wraps.
 * Desktop: action area sits on the right, vertically centered.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** Tiny line above the title — e.g. role badge or section label. */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Action area — usually buttons. Stacks under title on mobile. */
  actions?: ReactNode;
  /** Tabs rendered below the title row, inside the same surface. */
  tabs?: ReactNode;
  /** Compact mode uses smaller typography. */
  size?: "default" | "compact";
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  tabs,
  size = "default",
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        {eyebrow ? <div className="text-micro font-semibold uppercase tracking-wide text-ink-500">{eyebrow}</div> : null}
        <h1
          className={cn(
            "font-display font-semibold tracking-tight text-ink-900 break-words",
            size === "compact" ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
          )}
        >
          {title}
        </h1>
        {description ? (
          <div className="max-w-2xl text-sm text-ink-500">{description}</div>
        ) : null}
        {tabs ? <div className="pt-2">{tabs}</div> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
