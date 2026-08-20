"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ModuleWithLessons } from "@/types/course";
import {
  createLessonAction,
  deleteModuleAction,
  reorderLessonsAction,
  updateModuleAction,
} from "@/app/teacher/courses/actions";

interface ModuleItemProps {
  courseId: string;
  module: ModuleWithLessons;
  isFirstModule: boolean;
  isLastModule: boolean;
  selectedLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  onMoveModuleUp: () => void;
  onMoveModuleDown: () => void;
}

export function ModuleItem({
  courseId,
  module,
  isFirstModule,
  isLastModule,
  selectedLessonId,
  onSelectLesson,
  onMoveModuleUp,
  onMoveModuleDown,
}: ModuleItemProps) {
  const router = useRouter();

  const [isEditingModule, setIsEditingModule] = useState(false);
  const [moduleTitle, setModuleTitle] = useState(module.title);
  const [moduleDesc, setModuleDesc] = useState(module.description ?? "");

  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await updateModuleAction(
        {
          moduleId: module.id,
          title: moduleTitle,
          description: moduleDesc || null,
        },
        courseId
      );
      if (res.success) {
        setIsEditingModule(false);
        router.refresh();
      } else {
        alert(res.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteModule = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete module "${module.title}" and its ${module.lessons.length} lessons?`
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const res = await deleteModuleAction(
        { moduleId: module.id },
        courseId
      );
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await createLessonAction(
        {
          moduleId: module.id,
          title: newLessonTitle.trim(),
        },
        courseId
      );
      if (res.success) {
        setNewLessonTitle("");
        setIsAddingLesson(false);
        onSelectLesson(res.data.id);
        router.refresh();
      } else {
        alert(res.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveLesson = async (
    lessonIndex: number,
    direction: "up" | "down"
  ) => {
    const targetIndex = direction === "up" ? lessonIndex - 1 : lessonIndex + 1;
    if (targetIndex < 0 || targetIndex >= module.lessons.length) return;

    const reordered = [...module.lessons];
    const temp = reordered[lessonIndex];
    reordered[lessonIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const orderedIds = reordered.map((l) => l.id);

    try {
      await reorderLessonsAction(
        {
          moduleId: module.id,
          orderedLessonIds: orderedIds,
        },
        courseId
      );
      router.refresh();
    } catch (err) {
      alert("Failed to reorder lessons: " + err);
    }
  };

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-2xs overflow-hidden">
      {/* Module Header */}
      <div className="border-b border-outline-variant bg-surface-container-low p-3.5">
        {isEditingModule ? (
          <form onSubmit={handleUpdateModule} className="space-y-2">
            <input
              type="text"
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              placeholder="Module title"
              required
              className="w-full rounded border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-xs text-on-surface"
            />
            <input
              type="text"
              value={moduleDesc}
              onChange={(e) => setModuleDesc(e.target.value)}
              placeholder="Module description (optional)"
              className="w-full rounded border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-xs text-on-surface"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingModule(false)}
                className="rounded px-2 py-1 text-[11px] text-secondary hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded bg-primary px-2.5 py-1 text-[11px] font-semibold text-on-primary"
              >
                Save
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-primary-container px-1.5 py-0.5 text-[10px] font-bold text-on-primary-container">
                  M{module.position}
                </span>
                <h4 className="line-clamp-1 text-xs font-bold text-on-surface">
                  {module.title}
                </h4>
              </div>
              {module.description && (
                <p className="mt-1 line-clamp-1 text-[11px] text-secondary">
                  {module.description}
                </p>
              )}
            </div>

            {/* Reorder and Action buttons */}
            <div className="flex items-center gap-0.5 text-secondary">
              <button
                type="button"
                onClick={onMoveModuleUp}
                disabled={isFirstModule}
                className="rounded p-1 hover:bg-surface-container hover:text-on-surface disabled:opacity-30"
                title="Move Module Up"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={onMoveModuleDown}
                disabled={isLastModule}
                className="rounded p-1 hover:bg-surface-container hover:text-on-surface disabled:opacity-30"
                title="Move Module Down"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setIsEditingModule(true)}
                className="rounded p-1 hover:bg-surface-container hover:text-primary"
                title="Edit Module"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={handleDeleteModule}
                className="rounded p-1 hover:bg-error-container/40 hover:text-error"
                title="Delete Module"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lesson List */}
      <div className="p-2 space-y-1">
        {module.lessons.length === 0 ? (
          <p className="py-2 text-center text-[11px] text-outline">
            No lessons in this module yet.
          </p>
        ) : (
          module.lessons.map((lesson, idx) => {
            const isSelected = selectedLessonId === lesson.id;
            return (
              <div
                key={lesson.id}
                className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                  isSelected
                    ? "border-l-4 border-primary bg-surface-container-low font-semibold text-primary"
                    : "text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectLesson(lesson.id)}
                  className="flex-1 text-left flex items-center gap-2 truncate"
                >
                  <span className="text-[10px] text-secondary font-mono">
                    {module.position}.{lesson.position}
                  </span>
                  <span className="truncate">{lesson.title}</span>
                  {lesson.isFree && (
                    <span className="rounded bg-emerald-50 px-1 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                      Free
                    </span>
                  )}
                </button>

                {/* Move Lesson Reorder controls */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleMoveLesson(idx, "up")}
                    disabled={idx === 0}
                    className="p-0.5 text-secondary hover:text-on-surface disabled:opacity-20"
                    title="Move Lesson Up"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveLesson(idx, "down")}
                    disabled={idx === module.lessons.length - 1}
                    className="p-0.5 text-secondary hover:text-on-surface disabled:opacity-20"
                    title="Move Lesson Down"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Add Lesson Form / Trigger */}
        {isAddingLesson ? (
          <form onSubmit={handleAddLesson} className="mt-2 border-t border-outline-variant pt-2 space-y-1.5">
            <input
              type="text"
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              placeholder="New lesson title..."
              required
              autoFocus
              className="w-full rounded border border-outline-variant bg-surface-container-lowest px-2 py-1 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsAddingLesson(false)}
                className="rounded px-2 py-0.5 text-[11px] text-secondary hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded bg-primary px-2 py-0.5 text-[11px] font-semibold text-on-primary"
              >
                Add
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingLesson(true)}
            className="mt-1 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-outline-variant py-1 text-[11px] font-medium text-secondary hover:border-primary hover:text-primary transition-colors"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Lesson</span>
          </button>
        )}
      </div>
    </div>
  );
}
