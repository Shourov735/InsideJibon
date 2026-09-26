/**
 * IconButton — square button sized for a single icon.
 *
 * Provides accessible labelling via aria-label and a consistent
 * touch target (44px on mobile, 40px on desktop).
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required for screen readers since the button has no visible text. */
  "aria-label": string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "solid";
  children: ReactNode;
}

const SIZE = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

const VARIANT = {
  ghost:
    "bg-transparent text-ink-700 hover:bg-surface-1 active:bg-surface-2",
  outline:
    "bg-surface-0 text-ink-900 border border-outline-variant hover:bg-surface-1",
  solid:
    "bg-primary text-on-primary hover:bg-primary/90",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { size = "md", variant = "ghost", className, children, type = "button", ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-xl transition-[background,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-95",
          "focus-visible:outline-2 focus-visible:outline-[color:var(--color-info)] focus-visible:outline-offset-2",
          SIZE[size],
          VARIANT[variant],
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
