"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "@/i18n/client";
import type { ClassSession } from "@/db/schema";
import { cn } from "@/lib/utils";
import {
  deleteClassSessionAction,
  markSessionCompletedAction,
  cancelSessionAction,
} from "@/app/teacher/courses/[courseId]/classes/actions";
import { ClassSessionForm } from "./class-session-form";

interface ClassSessionCardProps {
  session: ClassSession;
  courseId: string;
}

export function ClassSessionCard({ session, courseId }: ClassSessionCardProps) {
  const { t, locale } = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedDate = session.scheduledAt
    ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
      }).format(new Date(session.scheduledAt))
    : null;

  const handleDelete = () => {
    if (!confirm(t("teacher.classes.deleteConfirm"))) return;
    
    startTransition(async () => {
      setError(null);
      const result = await deleteClassSessionAction({ sessionId: session.id }, courseId);
      if (!result.success) {
        setError(result.error);
      }
    });
  };

  const handleMarkCompleted = () => {
    startTransition(async () => {
      setError(null);
      const result = await markSessionCompletedAction({ sessionId: session.id }, courseId);
      if (!result.success) {
        setError(result.error);
      }
    });
  };

  const handleCancelSession = () => {
    startTransition(async () => {
      setError(null);
      const result = await cancelSessionAction({ sessionId: session.id }, courseId);
      if (!result.success) {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <div className="flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs">
        <div className="space-y-3">
          {/* Header Badges */}
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                session.sessionType === "live"
                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              )}
            >
              {session.sessionType === "live"
                ? t("teacher.classes.type.live")
                : t("teacher.classes.type.recorded")}
            </span>
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                session.status === "upcoming" && "bg-green-100 text-green-800 border border-green-200",
                session.status === "completed" && "bg-surface-container text-on-surface-variant border border-outline-variant",
                session.status === "cancelled" && "bg-red-100 text-red-800 border border-red-200"
              )}
            >
              {session.status === "upcoming" && t("teacher.classes.status.upcoming")}
              {session.status === "completed" && t("teacher.classes.status.completed")}
              {session.status === "cancelled" && t("teacher.classes.status.cancelled")}
            </span>
          </div>

          {/* Title */}
          <div>
            <h3 className="text-base font-bold tracking-tight text-on-surface line-clamp-1">
              {session.title}
            </h3>
          </div>

          {/* Description preview */}
          {session.description && (
            <p className="line-clamp-2 text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">
              {session.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex flex-col gap-1.5 pt-1 text-[11px] font-medium text-secondary">
            {formattedDate && (
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formattedDate}
              </span>
            )}
            
            {session.durationMinutes && (
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {session.durationMinutes} min
              </span>
            )}

            {session.externalUrl && (
              <a
                href={session.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-primary hover:underline truncate mt-1"
              >
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {session.sessionType === "live" ? t("teacher.classes.joinClass") : t("teacher.classes.watchRecording")}
              </a>
            )}
          </div>
          
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant pt-3">
          <button
            onClick={() => setIsEditModalOpen(true)}
            disabled={isPending}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50"
          >
            {t("teacher.classes.editSession")}
          </button>
          
          {session.status === "upcoming" && (
            <>
              <button
                onClick={handleCancelSession}
                disabled={isPending}
                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {t("teacher.classes.cancelSession")}
              </button>
              <button
                onClick={handleMarkCompleted}
                disabled={isPending}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary shadow-2xs hover:bg-primary-container hover:text-on-primary-container transition-colors disabled:opacity-50"
              >
                {t("teacher.classes.markCompleted")}
              </button>
            </>
          )}

          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            title={t("teacher.classes.deleteSession")}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {isEditModalOpen && (
        <ClassSessionForm
          courseId={courseId}
          session={session}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </>
  );
}
