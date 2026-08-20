import Link from "next/link";

import { ProgressBar } from "@/components/student/progress-bar";
import type { StudentCourseSummary } from "@/types/learning";

interface StudentCourseCardProps {
  course: StudentCourseSummary;
}

export function StudentCourseCard({ course }: StudentCourseCardProps) {
  const learnHref = `/student/courses/${course.courseId}/learn`;
  const resumeHref = course.lastLesson
    ? `${learnHref}?lesson=${course.lastLesson.id}`
    : learnHref;

  return (
    <Link
      href={resumeHref}
      className="group flex flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-[16/9] overflow-hidden border-b border-outline-variant bg-surface-container-high">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-container/20">
            <svg
              className="h-10 w-10 text-primary/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[11px] text-secondary">/{course.slug}</p>
          {course.completedAt && (
            <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
              Completed
            </span>
          )}
        </div>
        <h3 className="mt-1 line-clamp-1 text-lg font-bold tracking-tight text-on-surface group-hover:text-primary">
          {course.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">
          {course.description || "A structured course from InsideJibon."}
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-secondary">
              {course.progress.completed} of {course.progress.total} lessons
            </span>
            <span className="font-bold text-primary">
              {course.progress.percent}%
            </span>
          </div>
          <ProgressBar percent={course.progress.percent} className="mt-2" />
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-outline-variant pt-4">
          <span className="min-w-0 truncate text-xs font-medium text-on-surface">
            {course.teacherName ?? "InsideJibon Teacher"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
            {course.lastLesson ? "Continue" : "Start learning"}
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}