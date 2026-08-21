"use client";

import { useTranslations } from "@/i18n/client";
import type { ClassSession } from "@/db/schema";
import { cn } from "@/lib/utils";

interface UpcomingSessionsListProps {
  sessions: ClassSession[];
}

export function UpcomingSessionsList({ sessions }: UpcomingSessionsListProps) {
  const { t } = useTranslations();

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
        <p className="text-sm text-on-surface-variant">
          {t("student.classes.noUpcoming")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sessions.slice(0, 5).map((session) => {
        const isLive = session.sessionType === "live";
        const scheduledTime = session.scheduledAt ? new Date(session.scheduledAt) : new Date();
        const now = new Date();
        const diffMs = scheduledTime.getTime() - now.getTime();
        const isUrgent = diffMs > 0 && diffMs <= 30 * 60 * 1000;

        return (
          <div
            key={session.id}
            className={cn(
              "flex flex-col gap-4 overflow-hidden rounded-2xl border p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between transition-colors",
              isUrgent
                ? "border-primary/40 bg-primary-container/10"
                : "border-outline-variant bg-surface-container-lowest hover:border-primary/40"
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  isLive
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                )}>
                  {isLive ? t("student.classes.type.live") : t("student.classes.type.recorded")}
                </span>
                <span className="text-xs font-medium text-secondary">
                  {t("student.classes.scheduledFor")}: {scheduledTime.toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                  })}
                </span>
              </div>
              <h3 className="truncate text-base font-bold text-on-surface">
                {session.title}
              </h3>
            </div>
            
            {session.externalUrl && (
              <div className="shrink-0">
                <a
                  href={session.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-xs transition-colors",
                    isUrgent
                      ? "bg-primary text-on-primary hover:bg-primary-container"
                      : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                  )}
                >
                  {isLive ? t("student.classes.joinClass") : t("student.classes.watchRecording")}
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
