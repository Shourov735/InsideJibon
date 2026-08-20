import type { CourseStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: CourseStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles: Record<CourseStatus, { label: string; class: string }> = {
    draft: {
      label: "Draft",
      class:
        "bg-surface-container-highest text-on-surface-variant border-outline-variant",
    },
    published: {
      label: "Published",
      class:
        "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium",
    },
    archived: {
      label: "Archived",
      class:
        "bg-amber-50 text-amber-800 border-amber-300 font-medium",
    },
  };

  const current = styles[status] ?? styles.draft;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border uppercase tracking-wider font-semibold",
        current.class,
        className
      )}
    >
      {current.label}
    </span>
  );
}
