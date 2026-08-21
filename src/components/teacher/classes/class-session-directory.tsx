"use client";

import { useState } from "react";
import { useTranslations } from "@/i18n/client";
import type { ClassSession } from "@/db/schema";
import { ClassSessionCard } from "./class-session-card";
import { ClassSessionForm } from "./class-session-form";

interface ClassSessionDirectoryProps {
  sessions: ClassSession[];
  courseId: string;
}

export function ClassSessionDirectory({ sessions, courseId }: ClassSessionDirectoryProps) {
  const { t } = useTranslations();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const upcomingCount = sessions.filter((s) => s.status === "upcoming").length;
  const completedCount = sessions.filter((s) => s.status === "completed").length;
  const cancelledCount = sessions.filter((s) => s.status === "cancelled").length;

  return (
    <div className="space-y-6">
      {/* Stats and Create Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.classes.stat.total")}
            </span>
            <p className="mt-0.5 text-lg font-bold text-primary">{sessions.length}</p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.classes.stat.upcoming")}
            </span>
            <p className="mt-0.5 text-lg font-bold text-green-600">{upcomingCount}</p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.classes.stat.completed")}
            </span>
            <p className="mt-0.5 text-lg font-bold text-on-surface-variant">{completedCount}</p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.classes.stat.cancelled")}
            </span>
            <p className="mt-0.5 text-lg font-bold text-red-600">{cancelledCount}</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t("teacher.classes.createSession")}
        </button>
      </div>

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center shadow-2xs">
          <svg className="mx-auto h-12 w-12 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-sm font-bold text-on-surface">
            {t("teacher.classes.noSessions")}
          </h3>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            + {t("teacher.classes.createSession")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <ClassSessionCard
              key={session.id}
              session={session}
              courseId={courseId}
            />
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <ClassSessionForm
          courseId={courseId}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
}
