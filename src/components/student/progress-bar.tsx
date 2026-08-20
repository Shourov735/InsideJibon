interface ProgressBarProps {
  percent: number;
  className?: string;
  barClassName?: string;
}

/**
 * Linear course progress indicator — 4px bar, light grey track, primary fill.
 */
export function ProgressBar({ percent, className = "", barClassName = "" }: ProgressBarProps) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      className={`h-1 w-full overflow-hidden rounded-full bg-surface-container-high ${className}`}
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Course progress"
    >
      <div
        className={`h-full rounded-full bg-primary transition-[width] duration-500 ${barClassName}`}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}