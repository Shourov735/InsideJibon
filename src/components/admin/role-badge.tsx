import { cn } from "@/lib/utils";

interface RoleBadgeProps {
  role: "student" | "teacher" | "admin";
  className?: string;
  label?: string;
}

export function RoleBadge({ role, className, label }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wider",
        role === "student" && "bg-blue-100 text-blue-800",
        role === "teacher" && "bg-green-100 text-green-800",
        role === "admin" && "bg-amber-100 text-amber-800",
        className
      )}
    >
      {label || role}
    </span>
  );
}
