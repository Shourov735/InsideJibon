"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Lesson } from "@/db/schema";
import {
  deleteLessonAction,
  updateLessonAction,
} from "@/app/teacher/courses/actions";

interface LessonEditorProps {
  courseId: string;
  lesson: Lesson;
  moduleTitle: string;
  onDeleted?: () => void;
}

export function LessonEditor({
  courseId,
  lesson,
  moduleTitle,
  onDeleted,
}: LessonEditorProps) {
  const router = useRouter();

  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description ?? "");
  const [content, setContent] = useState(lesson.content ?? "");
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl ?? "");
  const [isFree, setIsFree] = useState(lesson.isFree);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await updateLessonAction(
        {
          lessonId: lesson.id,
          title,
          description: description || null,
          content: content || null,
          videoUrl: videoUrl || null,
          isFree,
        },
        courseId
      );

      if (!res.success) {
        setStatusMessage({ type: "error", text: res.error });
        return;
      }

      setStatusMessage({ type: "success", text: "Lesson saved successfully." });
      router.refresh();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save lesson",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete lesson "${lesson.title}"?`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setStatusMessage(null);

    try {
      const res = await deleteLessonAction(
        { lessonId: lesson.id },
        courseId
      );

      if (!res.success) {
        setStatusMessage({ type: "error", text: res.error });
        setIsDeleting(false);
        return;
      }

      router.refresh();
      onDeleted?.();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete lesson",
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-surface p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-4">
          <div className="flex items-center gap-2 text-xs font-medium text-secondary">
            <span>{moduleTitle}</span>
            <svg
              className="h-3.5 w-3.5 text-outline"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="text-on-surface font-semibold">
              Lesson #{lesson.position}: {lesson.title}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-error/30 bg-error-container/20 px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error-container/40 disabled:opacity-50"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span>{isDeleting ? "Deleting..." : "Delete Lesson"}</span>
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`rounded-lg border p-3.5 text-xs font-medium ${
              statusMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-error/30 bg-error-container/40 text-on-error-container"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Title & Preview Toggle */}
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-on-surface">Lesson Details</h4>

            <div>
              <label
                htmlFor="lesson-title"
                className="block text-xs font-semibold text-on-surface"
              >
                Lesson Title <span className="text-error">*</span>
              </label>
              <input
                id="lesson-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 1.1 Introduction to Newton's Laws"
                required
                className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="lesson-description"
                className="block text-xs font-semibold text-on-surface"
              >
                Short Summary / Objectives
              </label>
              <textarea
                id="lesson-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key concepts covered in this lesson..."
                className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Free Preview Checkbox */}
            <div className="flex items-center gap-2.5 pt-2">
              <input
                id="is-free"
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <label htmlFor="is-free" className="text-xs font-medium text-on-surface cursor-pointer">
                Free Preview Lesson (allow public/unenrolled preview)
              </label>
            </div>
          </div>

          {/* Video Link */}
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-on-surface">Lesson Video</h4>
              <span className="text-xs text-secondary">Optional external link</span>
            </div>

            <div>
              <label
                htmlFor="video-url"
                className="block text-xs font-semibold text-on-surface"
              >
                Video Link URL (YouTube unlisted / direct video stream)
              </label>
              <input
                id="video-url"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {videoUrl && (
              <p className="text-xs text-secondary">
                Configured video link: <span className="font-mono text-primary">{videoUrl}</span>
              </p>
            )}
          </div>

          {/* Lesson Content / Notes */}
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-on-surface">Lesson Content & Notes</h4>
              <span className="text-xs text-secondary">Markdown supported</span>
            </div>

            <div>
              <label
                htmlFor="lesson-content"
                className="block text-xs font-semibold text-on-surface"
              >
                Detailed Reading Material, Formulas & Explanations
              </label>
              <textarea
                id="lesson-content"
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write educational notes, formula breakdowns, step-by-step solutions or lesson instructions here..."
                className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3.5 font-mono text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Save Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Lesson"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
