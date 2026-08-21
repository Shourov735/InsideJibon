"use client";

import { useState } from "react";
import { useTranslations } from "@/i18n/client";
import type { Announcement } from "@/db/schema";
import { cn } from "@/lib/utils";

interface CourseAnnouncementsListProps {
  announcements: Announcement[];
}

export function CourseAnnouncementsList({ announcements }: CourseAnnouncementsListProps) {
  const { t } = useTranslations();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (announcements.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
        <p className="text-sm text-on-surface-variant">
          {t("student.announcements.noAnnouncements")}
        </p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev: Record<string, boolean>) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-4">
      {announcements.map((announcement) => {
        const isExpanded = expanded[announcement.id];
        const postedDate = announcement.publishedAt ? new Date(announcement.publishedAt) : new Date(announcement.createdAt);

        return (
          <div
            key={announcement.id}
            className={cn(
              "flex flex-col gap-3 rounded-2xl border p-5 shadow-xs transition-colors",
              announcement.isPinned
                ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-900/10"
                : "border-outline-variant bg-surface-container-lowest hover:border-primary/40"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-bold text-on-surface">
                {announcement.title}
              </h3>
              {announcement.isPinned && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {t("student.announcements.pinned")}
                </span>
              )}
            </div>
            
            <div className="text-sm text-secondary">
              {t("student.announcements.postedOn")}: {postedDate.toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </div>

            <div className={cn(
              "prose prose-sm max-w-none text-on-surface-variant",
              !isExpanded && "line-clamp-3"
            )}>
              <p className="whitespace-pre-wrap">{announcement.content}</p>
            </div>

            {announcement.content.length > 200 && (
              <button
                onClick={() => toggleExpand(announcement.id)}
                className="self-start text-sm font-semibold text-primary hover:underline"
              >
                {isExpanded ? "Show less" : t("student.announcements.readMore")}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
