import type { CourseStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: CourseStatus;
  label?: string;
  className?: string;
}

const STATUS_LABELS: Record<CourseStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const styles: Record<CourseStatus, string> = {
    draft:
      "bg-surface-container-highest text-on-surface-variant border-outline-variant",
    published: "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium",
    archived: "bg-amber-50 text-amber-800 border-amber-300 font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border uppercase tracking-wider font-semibold",
        styles[status] ?? styles.draft,
        className
      )}
    >
      {label ?? STATUS_LABELS[status] ?? STATUS_LABELS.draft}
    </span>
  );
}
