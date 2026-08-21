"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations } from "@/i18n/client";
import type { ClassSession } from "@/db/schema";
import {
  createClassSessionAction,
  updateClassSessionAction,
} from "@/app/teacher/courses/[courseId]/classes/actions";

interface ClassSessionFormProps {
  courseId: string;
  session?: ClassSession;
  onClose: () => void;
}

export function ClassSessionForm({ courseId, session, onClose }: ClassSessionFormProps) {
  const { t } = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Format date for datetime-local input
  const defaultDate = session?.scheduledAt
    ? new Date(new Date(session.scheduledAt).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // Clean up empty optional fields
    if (!data.scheduledAt) delete data.scheduledAt;
    if (!data.durationMinutes) delete data.durationMinutes;
    if (!data.description) delete data.description;
    
    // Convert duration to number if present
    if (data.durationMinutes) {
      data.durationMinutes = parseInt(data.durationMinutes as string, 10).toString();
    }

    startTransition(async () => {
      if (session) {
        const result = await updateClassSessionAction({ ...data, sessionId: session.id }, courseId);
        if (result.success) {
          onClose();
        } else {
          setError(result.error);
        }
      } else {
        const result = await createClassSessionAction({ ...data, courseId });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl border border-outline-variant max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-on-surface mb-6">
          {session ? t("teacher.classes.editSession") : t("teacher.classes.createSession")}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-on-surface">
              {t("teacher.classes.title")} *
            </label>
            <input
              name="title"
              type="text"
              required
              defaultValue={session?.title}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-on-surface">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              defaultValue={session?.description || ""}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-on-surface">
                Type
              </label>
              <select
                name="sessionType"
                defaultValue={session?.sessionType || "live"}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="live">{t("teacher.classes.type.live")}</option>
                <option value="recorded">{t("teacher.classes.type.recorded")}</option>
              </select>
            </div>
            
            {session && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-on-surface">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={session.status}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="upcoming">{t("teacher.classes.status.upcoming")}</option>
                  <option value="completed">{t("teacher.classes.status.completed")}</option>
                  <option value="cancelled">{t("teacher.classes.status.cancelled")}</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-on-surface">
              {t("teacher.classes.externalUrl")}
            </label>
            <input
              name="externalUrl"
              type="url"
              defaultValue={session?.externalUrl || ""}
              placeholder="https://..."
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-on-surface">
                {t("teacher.classes.scheduledAt")}
              </label>
              <input
                name="scheduledAt"
                type="datetime-local"
                defaultValue={defaultDate}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-on-surface">
                {t("teacher.classes.durationMinutes")}
              </label>
              <input
                name="durationMinutes"
                type="number"
                min="1"
                max="480"
                defaultValue={session?.durationMinutes || ""}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
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
              {isPending ? t("common.saving") : (session ? t("teacher.examForm.saveChanges") : t("teacher.classes.createSession"))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
