/**
 * Alert — inline message box for form feedback / banners.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger";

export interface AlertProps {
  tone?: Tone;
  title?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const TONE: Record<Tone, string> = {
  info: "bg-[color:var(--color-info)]/10 text-[color:var(--color-info)] border-[color:var(--color-info)]/30",
  success: "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)] border-[color:var(--color-success)]/30",
  warning: "bg-[color:var(--color-warning)]/10 text-[color:var(--color-warning)] border-[color:var(--color-warning)]/30",
  danger: "bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)] border-[color:var(--color-danger)]/30",
};

export function Alert({ tone = "info", title, children, icon, className }: AlertProps) {
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-3.5 text-sm",
        TONE[tone],
        className,
      )}
    >
      {icon ? <span aria-hidden className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        {title ? <div className="font-semibold">{title}</div> : null}
        <div className={cn(title ? "mt-0.5" : null)}>{children}</div>
      </div>
    </div>
  );
}
