/**
 * Button — single source of truth for action buttons.
 *
 * Consolidates the dozens of inline button classes used across
 * the app into one typed component. Use `variant` for tone,
 * `size` for height, `fullWidth` for mobile-friendly CTAs.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/95 disabled:bg-primary/40",
  secondary:
    "bg-surface-2 text-ink-900 hover:bg-surface-3 disabled:bg-surface-2/60",
  outline:
    "bg-transparent text-ink-900 border border-outline-variant hover:bg-surface-1 disabled:opacity-50",
  ghost:
    "bg-transparent text-ink-700 hover:bg-surface-1 disabled:opacity-50",
  danger:
    "bg-[color:var(--color-danger)] text-white hover:bg-[color:var(--color-danger)]/90 disabled:opacity-50",
  success:
    "bg-[color:var(--color-success)] text-white hover:bg-[color:var(--color-success)]/90 disabled:opacity-50",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      leadingIcon,
      trailingIcon,
      className,
      children,
      disabled,
      type = "button",
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[background,transform,opacity] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:translate-y-px disabled:cursor-not-allowed",
          "focus-visible:outline-2 focus-visible:outline-[color:var(--color-info)] focus-visible:outline-offset-2",
          VARIANT[variant],
          SIZE[size],
          fullWidth && "w-full",
          className,
        )}
        {...rest}
      >
        {loading ? (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
        ) : leadingIcon ? (
          <span aria-hidden className="-ml-0.5 inline-flex">{leadingIcon}</span>
        ) : null}
        <span className={cn(loading && "opacity-70")}>{children}</span>
        {!loading && trailingIcon ? (
          <span aria-hidden className="-mr-0.5 inline-flex">{trailingIcon}</span>
        ) : null}
      </button>
    );
  },
);
