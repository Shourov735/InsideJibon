/**
 * Badge — small status / category pill.
 *
 * Consolidates the dozens of inline pill components that exist
 * across the app. Use `tone` to communicate semantic meaning.
 */

import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone =
  | "neutral"
  | "muted"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "role";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: "xs" | "sm";
  icon?: ReactNode;
  children: ReactNode;
}

const TONE: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-700",
  muted: "bg-surface-1 text-ink-500 border border-outline-variant",
  primary: "bg-primary-container text-on-primary-container",
  success: "bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]",
  warning: "bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)]",
  danger: "bg-[color:var(--color-danger)]/12 text-[color:var(--color-danger)]",
  info: "bg-[color:var(--color-info)]/12 text-[color:var(--color-info)]",
  role: "bg-role-container text-role",
};

const SIZE: Record<NonNullable<BadgeProps["size"]>, string> = {
  xs: "px-2 py-0.5 text-[10px]",
  sm: "px-2.5 py-1 text-xs",
};

export function Badge({
  tone = "neutral",
  size = "sm",
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide whitespace-nowrap",
        SIZE[size],
        TONE[tone],
        className,
      )}
      {...rest}
    >
      {icon ? <span aria-hidden className="-ml-0.5">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}
