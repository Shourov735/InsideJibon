import { cn } from "@/lib/utils";

/**
 * R1 §5 — Skeleton primitive.
 *
 * Three variants:
 *   - `line`     → 1-line text placeholder (1em tall)
 *   - `block`    → multi-line block (defaults to 1em × width)
 *   - `circle`   → circular placeholder
 *
 * Uses an animated gradient shimmer. Caller controls width/height
 * through the standard className API; passing `width="40%"` via the
 * `style` prop is also supported. Every skeleton is `aria-busy` so
 * screen readers announce "in progress" appropriately.
 */

export type SkeletonVariant = "line" | "block" | "circle";

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
  /** Pass `false` to disable shimmer animation when a parent already manages state. */
  shimmer?: boolean;
  /** aria-busy override — defaults to true. */
  busy?: boolean;
}

function sizeStyle(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

export function Skeleton({
  variant = "block",
  width,
  height,
  className,
  shimmer = true,
  busy = true,
}: SkeletonProps) {
  const variantClass =
    variant === "circle"
      ? "rounded-full"
      : variant === "line"
        ? "rounded-[var(--radius-xs)]"
        : "rounded-[var(--radius-sm)]";

  const dimStyle: React.CSSProperties = {};
  if (variant === "circle") {
    dimStyle.width = sizeStyle(width ?? height ?? "2rem");
    dimStyle.height = sizeStyle(height ?? width ?? "2rem");
  } else {
    if (width !== undefined) dimStyle.width = sizeStyle(width);
    if (height !== undefined) dimStyle.height = sizeStyle(height);
  }

  return (
    <span
      role="status"
      aria-busy={busy || undefined}
      style={dimStyle}
      className={cn(
        "inline-block align-middle",
        variantClass,
        shimmer
          ? "bg-gradient-to-r from-surface-container-low via-surface-container to-surface-container-low bg-[length:200%_100%] animate-[skeleton-shimmer_1.4s_ease-in-out_infinite]"
          : "bg-surface-container",
        className,
      )}
    />
  );
}

/**
 * SkeletonStack — composes a vertical stack of `Skeleton` lines that
 * approximates body text. Mirrors the look of `space-y-2`.
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-busy>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          variant="line"
          width={i === lines - 1 ? "60%" : "100%"}
          height="0.85rem"
        />
      ))}
    </div>
  );
}
