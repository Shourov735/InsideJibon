"use client";

import { useTranslations } from "@/i18n/client";
import type { ClassSession } from "@/db/schema";
import { cn } from "@/lib/utils";

interface CourseSessionsListProps {
  sessions: ClassSession[];
}

export function CourseSessionsList({ sessions }: CourseSessionsListProps) {
  const { t } = useTranslations();

  const upcoming = sessions.filter((s) => s.status === "upcoming");
  const completed = sessions.filter((s) => s.status === "completed");
  const cancelled = sessions.filter((s) => s.status === "cancelled");

  const renderGroup = (group: ClassSession[], title: string, emptyText: string) => (
    <div className="mb-8">
      <h2 className="mb-4 text-lg font-bold tracking-tight text-on-surface">
        {title}
      </h2>
      {group.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
          <p className="text-sm text-on-surface-variant">{emptyText}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {group.map((session) => {
            const isLive = session.sessionType === "live";
            const scheduledTime = session.scheduledAt ? new Date(session.scheduledAt) : null;
            
            return (
              <div
                key={session.id}
                className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs transition-colors hover:border-primary/40 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      isLive
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    )}>
                      {isLive ? t("student.classes.type.live") : t("student.classes.type.recorded")}
                    </span>
                    {scheduledTime && (
                      <span className="text-xs font-medium text-secondary">
                        {t("student.classes.scheduledFor")}: {scheduledTime.toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}
                      </span>
                    )}
                    {session.durationMinutes && (
                      <span className="text-xs font-medium text-secondary">
                        • {session.durationMinutes} min
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-on-surface">
                    {session.title}
                  </h3>
                  {session.description && (
                    <p className="text-sm text-on-surface-variant">
                      {session.description}
                    </p>
                  )}
                </div>
                
                {session.externalUrl && session.status === "upcoming" && (
                  <div className="shrink-0 mt-2 sm:mt-0">
                    <a
                      href={session.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
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
                {session.externalUrl && session.status === "completed" && (
                  <div className="shrink-0 mt-2 sm:mt-0">
                    <a
                      href={session.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-surface-container-high px-4 py-2 text-sm font-semibold text-on-surface shadow-xs transition-colors hover:bg-surface-container-highest"
                    >
                      {t("student.classes.watchRecording")}
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
      )}
    </div>
  );

  return (
    <div className="flex flex-col">
      {renderGroup(upcoming, t("student.classes.status.upcoming"), t("student.classes.noUpcoming"))}
      {completed.length > 0 && renderGroup(completed, t("student.classes.status.completed"), "")}
      {cancelled.length > 0 && renderGroup(cancelled, t("student.classes.status.cancelled"), "")}
    </div>
  );
}
