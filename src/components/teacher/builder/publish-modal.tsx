"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { CourseWithCurriculum } from "@/types/course";
import {
  publishCourseAction,
  unpublishCourseAction,
} from "@/app/teacher/courses/actions";

interface PublishModalProps {
  course: CourseWithCurriculum;
  isOpen: boolean;
  onClose: () => void;
}

export function PublishModal({ course, isOpen, onClose }: PublishModalProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate checklist items
  const titleValid = Boolean(course.title && course.title.trim().length >= 3);
  const slugValid = Boolean(course.slug && course.slug.trim().length > 0);
  const descValid = Boolean(
    course.description && course.description.trim().length >= 10
  );
  const hasModules = course.modules.length >= 1;
  const totalLessons = course.modules.reduce(
    (acc, m) => acc + m.lessons.length,
    0
  );
  const hasLessons = totalLessons >= 1;

  const canPublish =
    titleValid && slugValid && descValid && hasModules && hasLessons;

  const handlePublish = async () => {
    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await publishCourseAction({ courseId: course.id });
      if (!res.success) {
        setActionError(res.error);
        return;
      }
      router.refresh();
      onClose();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to publish course"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnpublish = async () => {
    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await unpublishCourseAction({ courseId: course.id });
      if (!res.success) {
        setActionError(res.error);
        return;
      }
      router.refresh();
      onClose();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to unpublish course"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-outline-variant pb-4">
          <h3 className="text-lg font-bold text-on-surface">
            {course.status === "published"
              ? "Course Publishing Status"
              : "Publish Course"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-secondary hover:bg-surface-container hover:text-on-surface"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {actionError && (
          <div className="mt-4 rounded-lg border border-error/30 bg-error-container/40 p-3 text-xs text-on-error-container">
            {actionError}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <p className="text-sm text-on-surface-variant">
            {course.status === "published"
              ? "This course is live and publicly accessible. You can unpublish it anytime to return it to draft mode."
              : "Review the publishing checklist below. All requirements must be satisfied before publishing."}
          </p>

          {/* Checklist */}
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
              Prerequisites Checklist
            </h4>

            <div className="space-y-2 text-xs">
              <ChecklistItem
                passed={titleValid}
                label="Course title (at least 3 characters)"
              />
              <ChecklistItem
                passed={slugValid}
                label="Valid unique URL slug"
              />
              <ChecklistItem
                passed={descValid}
                label="Course description (at least 10 characters)"
              />
              <ChecklistItem
                passed={hasModules}
                label={`At least 1 module (Current: ${course.modules.length})`}
              />
              <ChecklistItem
                passed={hasLessons}
                label={`At least 1 lesson across modules (Current: ${totalLessons})`}
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-outline-variant pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-medium text-secondary transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            Close
          </button>

          {course.status === "published" ? (
            <button
              type="button"
              onClick={handleUnpublish}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
            >
              {isProcessing ? "Processing..." : "Unpublish Course (Set to Draft)"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish || isProcessing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Publishing..." : "Confirm & Publish Course"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {passed ? (
        <svg
          className="h-4 w-4 text-emerald-600 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg
          className="h-4 w-4 text-error shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
      <span className={passed ? "text-on-surface" : "text-error font-medium"}>
        {label}
      </span>
    </div>
  );
}
