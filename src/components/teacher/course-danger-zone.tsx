"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Course } from "@/db/schema";
import { useTranslations } from "@/i18n/client";
import {
  archiveCourseAction,
  deleteCourseAction,
  restoreCourseAction,
} from "@/app/teacher/courses/actions";

interface CourseDangerZoneProps {
  course: Course;
}

export function CourseDangerZone({ course }: CourseDangerZoneProps) {
  const router = useRouter();
  const { t } = useTranslations();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleArchive = async () => {
    const confirmed = window.confirm(t("teacher.courseDangerZone.archiveConfirm"));
    if (!confirmed) return;

    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await archiveCourseAction({ courseId: course.id });
      if (!res.success) {
        setErrorMessage(res.error);
        return;
      }
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("teacher.courseDangerZone.failedArchive")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await restoreCourseAction({ courseId: course.id });
      if (!res.success) {
        setErrorMessage(res.error);
        return;
      }
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("teacher.courseDangerZone.failedRestore")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (course.status === "published") {
      alert(t("teacher.courseDangerZone.publishedCannotDelete"));
      return;
    }

    const confirmed = window.confirm(
      t("teacher.courseDangerZone.deleteConfirm", { title: course.title })
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await deleteCourseAction({ courseId: course.id });
      if (!res.success) {
        setErrorMessage(res.error);
        return;
      }
      router.push("/teacher/courses");
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("teacher.courseDangerZone.failedDelete")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-error/30 bg-surface-container-lowest p-6 shadow-xs space-y-4">
      <div>
        <h3 className="text-base font-bold text-error">
          {t("teacher.courseDangerZone.title")}
        </h3>
        <p className="text-xs text-secondary">
          {t("teacher.courseDangerZone.desc")}
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-error/30 bg-error-container/40 p-3 text-xs text-on-error-container">
          {errorMessage}
        </div>
      )}

      <div className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-low text-xs">
        {/* Archive / Restore Toggle */}
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-bold text-on-surface">
              {course.status === "archived"
                ? t("teacher.courseDangerZone.restoreCourse")
                : t("teacher.courseDangerZone.archiveCourse")}
            </span>
            <p className="text-[11px] text-secondary">
              {course.status === "archived"
                ? t("teacher.courseDangerZone.restoreDesc")
                : t("teacher.courseDangerZone.archiveDesc")}
            </p>
          </div>

          {course.status === "archived" ? (
            <button
              type="button"
              onClick={handleRestore}
              disabled={isProcessing}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 font-semibold text-primary hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              {t("teacher.courseDangerZone.restoreToDraft")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleArchive}
              disabled={isProcessing}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 font-semibold text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              {t("teacher.courseDangerZone.archiveCourse")}
            </button>
          )}
        </div>

        {/* Delete Course */}
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-bold text-error">
              {t("teacher.courseDangerZone.deleteCourse")}
            </span>
            <p className="text-[11px] text-secondary">
              {course.status === "published"
                ? t("teacher.courseDangerZone.deleteDescPublished")
                : t("teacher.courseDangerZone.deleteDesc")}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isProcessing || course.status === "published"}
            className="rounded-lg border border-error/40 bg-error-container/20 px-3 py-1.5 font-semibold text-error hover:bg-error-container/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("teacher.courseDangerZone.deletePermanently")}
          </button>
        </div>
      </div>
    </div>
  );
}
