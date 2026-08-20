"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Course } from "@/db/schema";
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleArchive = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to archive this course? It will be hidden from active course catalogs."
    );
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
        err instanceof Error ? err.message : "Failed to archive course"
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
        err instanceof Error ? err.message : "Failed to restore course"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (course.status === "published") {
      alert(
        "Published courses cannot be permanently deleted. Please archive the course instead."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete course "${course.title}"? This cannot be undone.`
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
        err instanceof Error ? err.message : "Failed to delete course"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-error/30 bg-surface-container-lowest p-6 shadow-xs space-y-4">
      <div>
        <h3 className="text-base font-bold text-error">Danger Zone</h3>
        <p className="text-xs text-secondary">
          Actions related to course lifecycle and permanent data removal.
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
              {course.status === "archived" ? "Restore Course" : "Archive Course"}
            </span>
            <p className="text-[11px] text-secondary">
              {course.status === "archived"
                ? "Restores this archived course back to draft status."
                : "Archived courses are hidden from student discovery."}
            </p>
          </div>

          {course.status === "archived" ? (
            <button
              type="button"
              onClick={handleRestore}
              disabled={isProcessing}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 font-semibold text-primary hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              Restore to Draft
            </button>
          ) : (
            <button
              type="button"
              onClick={handleArchive}
              disabled={isProcessing}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 font-semibold text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              Archive Course
            </button>
          )}
        </div>

        {/* Delete Course */}
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-bold text-error">Delete Course</span>
            <p className="text-[11px] text-secondary">
              {course.status === "published"
                ? "Published courses cannot be deleted. Archive the course first."
                : "Permanently remove this draft/archived course and all its modules and lessons."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isProcessing || course.status === "published"}
            className="rounded-lg border border-error/40 bg-error-container/20 px-3 py-1.5 font-semibold text-error hover:bg-error-container/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
