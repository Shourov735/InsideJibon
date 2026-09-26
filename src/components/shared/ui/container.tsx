/**
 * Container — consistent page width wrapper.
 *
 * Use everywhere we previously had ad-hoc `max-w-6xl mx-auto`.
 */

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  /** "wide" reduces horizontal padding (for dashboards with tables). */
  bleed?: boolean;
}

const SIZE = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
};

export function Container({
  size = "lg",
  bleed = false,
  className,
  ...rest
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        SIZE[size],
        bleed ? "px-3 sm:px-5" : "px-4 sm:px-6 lg:px-8",
        className,
      )}
      {...rest}
    />
  );
}
