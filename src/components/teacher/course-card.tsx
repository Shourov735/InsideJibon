import Link from "next/link";

import type { CourseWithCounts } from "@/types/course";
import { StatusBadge } from "./status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { getTranslator } from "@/i18n/server";

interface CourseCardProps {
  course: CourseWithCounts;
}

export async function CourseCard({ course }: CourseCardProps) {
  const t = await getTranslator();
  const formattedDate = new Intl.DateTimeFormat(t.locale === "bn" ? "bn-BD" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(course.updatedAt));

  return (
    <div className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <span className="font-mono text-xs text-secondary">/{course.slug}</span>
            <h3 className="mt-1 line-clamp-1 text-lg font-bold tracking-tight text-on-surface">
              {course.title}
            </h3>
          </div>
          <StatusBadge
            status={course.status}
            label={course.status === "draft" ? t("common.status.draft") : course.status === "published" ? t("common.status.published") : t("common.status.archived")}
          />
        </div>

        <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">
          {course.description || t("teacher.courseCard.noDescription")}
        </p>

        {course.category && (
          <div className="mt-2">
            <CategoryBadge category={course.category} />
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 text-xs font-medium text-secondary">
          <div className="flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>{t.tn("common.moduleCount", course.moduleCount)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{t.tn("common.lessonCount", course.lessonCount)}</span>
          </div>

          <span className="ml-auto text-[11px] text-outline">
            {t("teacher.courseCard.updatedOn", { date: formattedDate })}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-outline-variant pt-4">
        <Link
          href={`/teacher/courses/${course.id}/builder`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary shadow-2xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>{t("teacher.courseCard.curriculumBuilder")}</span>
        </Link>

        <Link
          href={`/teacher/courses/${course.id}`}
          className="inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container hover:text-primary"
        >
          {t("teacher.courseCard.overview")}
        </Link>

        <Link
          href={`/teacher/courses/${course.id}/edit`}
          className="inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low p-2 text-secondary transition-colors hover:bg-surface-container hover:text-primary"
          title={t("teacher.courseCard.editSettings")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
