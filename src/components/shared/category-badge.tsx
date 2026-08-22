import type { CourseCategory } from "@/db/schema";

const CATEGORY_COLORS: Record<NonNullable<CourseCategory>, string> = {
  physics: "bg-blue-100 text-blue-800 border-blue-200",
  chemistry: "bg-amber-100 text-amber-800 border-amber-200",
  biology: "bg-emerald-100 text-emerald-800 border-emerald-200",
  mathematics: "bg-purple-100 text-purple-800 border-purple-200",
  english: "bg-sky-100 text-sky-800 border-sky-200",
  bangla: "bg-rose-100 text-rose-800 border-rose-200",
  general_science: "bg-teal-100 text-teal-800 border-teal-200",
  ict: "bg-indigo-100 text-indigo-800 border-indigo-200",
  other: "bg-surface-container text-on-surface-variant border-outline-variant",
};

const CATEGORY_LABELS: Record<NonNullable<CourseCategory>, string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  mathematics: "Mathematics",
  english: "English",
  bangla: "Bangla",
  general_science: "General Science",
  ict: "ICT",
  other: "Other",
};

interface CategoryBadgeProps {
  category: CourseCategory;
  size?: "xs" | "sm";
}

export function CategoryBadge({ category, size = "xs" }: CategoryBadgeProps) {
  if (!category) return null;

  const colorClass = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
  const label = CATEGORY_LABELS[category] ?? category;

  const sizeClass = size === "sm"
    ? "px-2.5 py-1 text-xs"
    : "px-2 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${colorClass} ${sizeClass}`}
    >
      {label}
    </span>
  );
}
