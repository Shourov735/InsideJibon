/**
 * Surface — the base container primitive.
 *
 * Replaces ad-hoc `bento-card` / `bento-card-static` mixes with a
 * proper typed API. All authenticated and public surfaces should
 * be built from this so we have one consistent card system.
 */

import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type SurfaceLevel = 0 | 1 | 2 | 3;
type SurfaceTone = "default" | "muted" | "primary" | "inverse";

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article" | "aside" | "header" | "footer";
  level?: SurfaceLevel;
  tone?: SurfaceTone;
  /** Hover lifts the card slightly — use for clickable cards. */
  interactive?: boolean;
  /** Removes the default padding so callers can compose freely. */
  flush?: boolean;
  children?: ReactNode;
}

const LEVEL_BG: Record<SurfaceLevel, string> = {
  0: "bg-surface-0",
  1: "bg-surface-1",
  2: "bg-surface-2",
  3: "bg-surface-3",
};

const TONE_OVERRIDE: Record<SurfaceTone, string | null> = {
  default: null,
  muted: "bg-surface-container-low",
  primary: "bg-primary text-on-primary",
  inverse: "bg-ink-900 text-surface-0",
};

export function Surface({
  as: Tag = "div",
  level = 0,
  tone = "default",
  interactive = false,
  flush = false,
  className,
  children,
  ...rest
}: SurfaceProps) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-outline-variant",
        TONE_OVERRIDE[tone] ?? LEVEL_BG[level],
        !flush && "p-4 sm:p-6",
        interactive &&
          "transition-[box-shadow,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-px hover:shadow-[0_4px_14px_-6px_rgba(0,0,0,0.08)]",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
