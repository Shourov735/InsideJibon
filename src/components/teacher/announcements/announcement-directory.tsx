"use client";

import { useState } from "react";
import { useTranslations } from "@/i18n/client";
import type { Announcement } from "@/db/schema";
import { AnnouncementCard } from "./announcement-card";
import { AnnouncementForm } from "./announcement-form";

interface AnnouncementDirectoryProps {
  announcements: Announcement[];
  courseId: string;
}

export function AnnouncementDirectory({ announcements, courseId }: AnnouncementDirectoryProps) {
  const { t } = useTranslations();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-secondary">
          {announcements.length} {announcements.length === 1 ? "Announcement" : "Announcements"}
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t("teacher.announcements.createAnnouncement")}
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center shadow-2xs">
          <svg className="mx-auto h-12 w-12 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <h3 className="mt-4 text-sm font-bold text-on-surface">
            {t("teacher.announcements.noAnnouncements")}
          </h3>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            + {t("teacher.announcements.createAnnouncement")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              courseId={courseId}
            />
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <AnnouncementForm
          courseId={courseId}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
}
