"use client";

import { useState } from "react";

import type { LearningCourse } from "@/types/learning";
import { MobileDrawer } from "@/components/shared/ui/mobile-drawer";
import { LearningSidebar } from "@/components/student/learning-sidebar";
import { useTranslations } from "@/i18n/client";
import { ChevronDownIcon, PlayIcon } from "@/components/shared/ui/icons";

interface LearnMobileCurriculumProps {
  course: LearningCourse;
  courseId: string;
  activeLessonId: string;
}

/**
 * Sticky header strip on mobile that opens a bottom-sheet drawer
 * containing the full curriculum. Renders nothing on desktop (lg).
 */
export function LearnMobileCurriculum({
  course,
  courseId,
  activeLessonId,
}: LearnMobileCurriculumProps) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);

  // Resolve the currently active lesson title for context.
  const activeLesson = course.modules
    .flatMap((m) => m.lessons.map((l) => ({ ...l, modulePos: m.position })))
    .find((l) => l.id === activeLessonId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-[color:var(--color-info)] focus-visible:outline-offset-[-2px]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
          <PlayIcon size={14} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-primary">
            {course.progress.percent}% complete
          </span>
          <span className="block truncate text-sm font-semibold text-ink-900">
            {activeLesson?.title ?? course.title}
          </span>
        </span>
        <span className="rounded-full bg-surface-1 px-2.5 py-1 text-[11px] font-semibold text-ink-700">
          {course.progress.completed}/{course.progress.total}
        </span>
        <ChevronDownIcon size={16} className="shrink-0 text-ink-500" />
      </button>

      <MobileDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={t("student.learn.curriculumAria")}
      >
        <LearningSidebar
          course={course}
          courseId={courseId}
          activeLessonId={activeLessonId}
          compact
        />
      </MobileDrawer>
    </>
  );
}
