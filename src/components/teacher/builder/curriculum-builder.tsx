"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { CourseWithCurriculum } from "@/types/course";
import type { MaterialSummary } from "@/types/material";
import { StatusBadge } from "../status-badge";
import { ModuleItem } from "./module-item";
import { LessonEditor } from "./lesson-editor";
import { PublishModal } from "./publish-modal";
import {
  createModuleAction,
  reorderModulesAction,
} from "@/app/teacher/courses/actions";

interface CurriculumBuilderProps {
  course: CourseWithCurriculum;
  initialMaterials?: MaterialSummary[];
}

export function CurriculumBuilder({
  course,
  initialMaterials = [],
}: CurriculumBuilderProps) {
  const router = useRouter();

  // Find first lesson to select by default if available
  const initialLessonId =
    course.modules.flatMap((m) => m.lessons)[0]?.id ?? null;

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    initialLessonId
  );
  const [materials, setMaterials] = useState<MaterialSummary[]>(initialMaterials);
  const [mobileTab, setMobileTab] = useState<"structure" | "editor">(
    initialLessonId ? "editor" : "structure"
  );
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Sync materials if initialMaterials changes
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDesc, setNewModuleDesc] = useState("");
  const [isSubmittingModule, setIsSubmittingModule] = useState(false);

  // Find selected lesson and parent module
  const selectedModule = course.modules.find((m) =>
    m.lessons.some((l) => l.id === selectedLessonId)
  );
  const selectedLesson = selectedModule?.lessons.find(
    (l) => l.id === selectedLessonId
  );

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;

    setIsSubmittingModule(true);
    try {
      const res = await createModuleAction({
        courseId: course.id,
        title: newModuleTitle.trim(),
        description: newModuleDesc.trim() || null,
      });

      if (res.success) {
        setNewModuleTitle("");
        setNewModuleDesc("");
        setIsAddingModule(false);
        router.refresh();
      } else {
        alert(res.error);
      }
    } finally {
      setIsSubmittingModule(false);
    }
  };

  const handleMoveModule = async (
    moduleIndex: number,
    direction: "up" | "down"
  ) => {
    const targetIndex = direction === "up" ? moduleIndex - 1 : moduleIndex + 1;
    if (targetIndex < 0 || targetIndex >= course.modules.length) return;

    const reordered = [...course.modules];
    const temp = reordered[moduleIndex];
    reordered[moduleIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const orderedIds = reordered.map((m) => m.id);

    try {
      await reorderModulesAction({
        courseId: course.id,
        orderedModuleIds: orderedIds,
      });
      router.refresh();
    } catch (err) {
      alert("Failed to reorder modules: " + err);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface text-on-surface">
      {/* Top Header / Builder Action Bar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/teacher/courses"
            className="flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Courses</span>
          </Link>

          <div className="h-5 w-px bg-outline-variant" />

          <div className="flex items-center gap-2.5">
            <h1 className="max-w-md truncate text-base font-bold text-on-surface">
              {course.title}
            </h1>
            <StatusBadge status={course.status} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/teacher/courses/${course.id}/edit`}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-xs font-medium text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            Course Settings
          </Link>

          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-xs transition-colors ${
              course.status === "published"
                ? "bg-emerald-700 text-white hover:bg-emerald-800"
                : "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container"
            }`}
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{course.status === "published" ? "Live (Publishing Status)" : "Publish Course"}</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="flex border-b border-outline-variant bg-surface-container-lowest lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("structure")}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center transition-colors ${
            mobileTab === "structure"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-secondary hover:text-on-surface"
          }`}
        >
          Structure ({course.modules.length} {course.modules.length === 1 ? "module" : "modules"})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("editor")}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center transition-colors ${
            mobileTab === "editor"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-secondary hover:text-on-surface"
          }`}
        >
          {selectedLesson ? `Lesson: ${selectedLesson.title}` : "Lesson Editor"}
        </button>
      </div>

      {/* Main Workspace Area (2 Columns on desktop, toggled on mobile) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Structure / Curriculum Pane */}
        <aside
          className={`h-full w-full lg:w-80 shrink-0 flex-col border-r border-outline-variant bg-surface ${
            mobileTab === "structure" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Structure Header */}
          <div className="border-b border-outline-variant p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-primary">Course Structure</h2>
              <span className="text-xs text-secondary font-mono">
                {course.modules.length} {course.modules.length === 1 ? "Module" : "Modules"}
              </span>
            </div>

            {/* Add Module Trigger / Form */}
            {isAddingModule ? (
              <form
                onSubmit={handleCreateModule}
                className="mt-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 space-y-2"
              >
                <input
                  type="text"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="Module title (e.g. Kinematics)"
                  required
                  autoFocus
                  className="w-full rounded border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  value={newModuleDesc}
                  onChange={(e) => setNewModuleDesc(e.target.value)}
                  placeholder="Module summary (optional)"
                  className="w-full rounded border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingModule(false)}
                    className="rounded px-2.5 py-1 text-[11px] text-secondary hover:bg-surface-container"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingModule}
                    className="rounded bg-primary px-3 py-1 text-[11px] font-semibold text-on-primary"
                  >
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingModule(true)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary bg-surface-container-low py-2 text-xs font-semibold text-primary hover:bg-surface-container transition-colors shadow-2xs"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Add Module</span>
              </button>
            )}
          </div>

          {/* Module List Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {course.modules.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center">
                <p className="text-xs text-secondary">
                  No modules yet. Click <strong>Add Module</strong> above to begin structuring your curriculum.
                </p>
              </div>
            ) : (
              course.modules.map((mod, idx) => (
                <ModuleItem
                  key={mod.id}
                  courseId={course.id}
                  module={mod}
                  isFirstModule={idx === 0}
                  isLastModule={idx === course.modules.length - 1}
                  selectedLessonId={selectedLessonId}
                  onSelectLesson={(lessonId) => {
                    setSelectedLessonId(lessonId);
                    setMobileTab("editor");
                  }}
                  onMoveModuleUp={() => handleMoveModule(idx, "up")}
                  onMoveModuleDown={() => handleMoveModule(idx, "down")}
                />
              ))
            )}
          </div>
        </aside>

        {/* Right Main Editor Canvas */}
        <div
          className={`flex-1 overflow-hidden ${
            mobileTab === "editor" ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedLesson && selectedModule ? (
            <LessonEditor
              key={selectedLesson.id}
              courseId={course.id}
              lesson={selectedLesson}
              moduleTitle={`Module ${selectedModule.position}: ${selectedModule.title}`}
              materials={materials.filter((m) => m.lessonId === selectedLesson.id)}
              onMaterialsChange={(updatedLessonMaterials) => {
                setMaterials((prev) => [
                  ...prev.filter((m) => m.lessonId !== selectedLesson.id),
                  ...updatedLessonMaterials,
                ]);
              }}
              onDeleted={() => {
                setSelectedLessonId(null);
                setMobileTab("structure");
                router.refresh();
              }}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center bg-surface p-8 text-center">
              <div className="max-w-md space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-high text-secondary">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-on-surface">
                  No Lesson Selected
                </h3>
                <p className="text-xs text-secondary">
                  Select a lesson from the curriculum sidebar to edit its details, reading notes, and supplementary materials, or click <strong>Add Lesson</strong> under a module.
                </p>
                <button
                  type="button"
                  onClick={() => setMobileTab("structure")}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-primary lg:hidden"
                >
                  View Curriculum Structure →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Publish Checklist Modal */}
      <PublishModal
        course={course}
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
      />
    </div>
  );
}
