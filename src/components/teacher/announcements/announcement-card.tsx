"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "@/i18n/client";
import type { Announcement } from "@/db/schema";
import { cn } from "@/lib/utils";
import {
  deleteAnnouncementAction,
  togglePinAnnouncementAction,
} from "@/app/teacher/courses/[courseId]/announcements/actions";
import { AnnouncementForm } from "./announcement-form";

interface AnnouncementCardProps {
  announcement: Announcement;
  courseId: string;
}

export function AnnouncementCard({ announcement, courseId }: AnnouncementCardProps) {
  const { t, locale } = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedDate = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(announcement.createdAt));

  const handleDelete = () => {
    if (!confirm(t("teacher.announcements.deleteConfirm"))) return;
    
    startTransition(async () => {
      setError(null);
      const result = await deleteAnnouncementAction({ announcementId: announcement.id }, courseId);
      if (!result.success) {
        setError(result.error);
      }
    });
  };

  const handleTogglePin = () => {
    startTransition(async () => {
      setError(null);
      const result = await togglePinAnnouncementAction({ announcementId: announcement.id }, courseId);
      if (!result.success) {
        setError(result.error);
      }
    });
  };

  const isLongContent = announcement.content.length > 200 || announcement.content.split("\n").length > 4;

  return (
    <>
      <div className={cn(
        "rounded-2xl border bg-surface-container-lowest p-5 shadow-2xs transition-all",
        announcement.isPinned ? "border-primary/40 ring-1 ring-primary/20" : "border-outline-variant hover:border-primary/40"
      )}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-base font-bold text-on-surface">
              {announcement.title}
            </h3>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleTogglePin}
                disabled={isPending}
                className={cn(
                  "flex items-center justify-center rounded-lg p-1.5 transition-colors disabled:opacity-50",
                  announcement.isPinned 
                    ? "bg-primary/10 text-primary hover:bg-primary/20" 
                    : "text-secondary hover:bg-surface-container hover:text-on-surface"
                )}
                title={t("teacher.announcements.togglePin")}
              >
                <svg className="h-4 w-4" fill={announcement.isPinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={announcement.isPinned ? "1" : "2"}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              
              <button
                onClick={() => setIsEditModalOpen(true)}
                disabled={isPending}
                className="text-secondary hover:text-primary transition-colors disabled:opacity-50"
                title={t("teacher.announcements.editAnnouncement")}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-secondary hover:text-red-600 transition-colors disabled:opacity-50"
                title={t("teacher.announcements.deleteAnnouncement")}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div>
            <div className={cn(
              "text-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed",
              !isExpanded && isLongContent && "line-clamp-4"
            )}>
              {announcement.content}
            </div>
            
            {isLongContent && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-xs font-semibold text-primary hover:underline"
              >
                {isExpanded ? t("teacher.examPreview.close") : t("student.announcements.readMore")}
              </button>
            )}
          </div>
          
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

          {/* Footer Metadata */}
          <div className="flex items-center gap-3 pt-2 text-[11px] font-medium text-secondary">
            {announcement.isPinned && (
              <span className="flex items-center gap-1 text-primary">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {t("teacher.announcements.pinned")}
              </span>
            )}
            <span>
              {t("student.announcements.postedOn")} {formattedDate}
            </span>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <AnnouncementForm
          courseId={courseId}
          announcement={announcement}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </>
  );
}
