"use client";

import { useState } from "react";

import type { CourseWithCurriculum } from "@/types/course";
import { useTranslations } from "@/i18n/client";
import { PublishModal } from "@/components/teacher/builder/publish-modal";

/**
 * Publish / unpublish control surfaced directly on the teacher course
 * overview so drafts can go live without entering the curriculum builder.
 * Hosts the same checklist modal the builder uses.
 */
export function CoursePublishControl({ course }: { course: CourseWithCurriculum }) {
  const { t } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold shadow-xs transition-colors ${
          course.status === "published"
            ? "bg-emerald-700 text-white hover:bg-emerald-800"
            : "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container"
        }`}
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          {course.status === "published"
            ? t("teacher.builder.livePublishingStatus")
            : t("teacher.builder.publishCourse")}
        </span>
      </button>

      <PublishModal course={course} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
