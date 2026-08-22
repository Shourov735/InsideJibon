"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations } from "@/i18n/client";
import type { Announcement } from "@/db/schema";
import {
  createAnnouncementAction,
  updateAnnouncementAction,
} from "@/app/teacher/courses/[courseId]/announcements/actions";

interface AnnouncementFormProps {
  courseId: string;
  announcement?: Announcement;
  onClose: () => void;
}

export function AnnouncementForm({ courseId, announcement, onClose }: AnnouncementFormProps) {
  const { t } = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    // Parse boolean
    const isPinned = formData.get("isPinned") === "true";

    startTransition(async () => {
      if (announcement) {
        const result = await updateAnnouncementAction({ 
          ...data, 
          isPinned,
          announcementId: announcement.id 
        }, courseId);
        if (result.success) {
          onClose();
        } else {
          setError(result.error);
        }
      } else {
        const result = await createAnnouncementAction({ 
          ...data, 
          isPinned,
          courseId 
        });
        if (result.success) {
          onClose();
        } else {
          setError(result.error);
        }
      }
    });
  };

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="announcement-form-title">
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl border border-outline-variant max-h-[90vh] overflow-y-auto">
        <h2 id="announcement-form-title" className="text-xl font-bold text-on-surface mb-6">
          {announcement ? t("teacher.announcements.editAnnouncement") : t("teacher.announcements.createAnnouncement")}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-on-surface">
              {t("teacher.courseForm.courseTitle")} *
            </label>
            <input
              name="title"
              type="text"
              required
              defaultValue={announcement?.title}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-on-surface">
              {t("teacher.announcements.content")} *
            </label>
            <textarea
              name="content"
              rows={5}
              required
              defaultValue={announcement?.content || ""}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPinned"
              name="isPinned"
              value="true"
              defaultChecked={announcement?.isPinned || false}
              className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <label htmlFor="isPinned" className="text-sm font-medium text-on-surface">
              {t("teacher.announcements.pinned")}
            </label>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-secondary hover:bg-surface-container-low transition-colors disabled:opacity-50"
            >
              {t("teacher.examForm.cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors disabled:opacity-50"
            >
              {isPending ? t("common.saving") : (announcement ? t("teacher.examForm.saveChanges") : t("teacher.announcements.createAnnouncement"))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
