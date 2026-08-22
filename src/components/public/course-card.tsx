import Link from "next/link";

import type { PublicCourseSummary } from "@/types/course";
import { CategoryBadge } from "@/components/shared/category-badge";

interface PublicCourseCardProps {
  course: PublicCourseSummary;
}

function TeacherAvatar({ course }: PublicCourseCardProps) {
  const name = course.teacher.name?.trim();
  const avatarSrc = course.teacher.imageUrl || "/jibon.jpg";

  return (
    <img
      src={avatarSrc}
      alt={name || "Tanvir Hasan Jibon"}
      className="h-8 w-8 rounded-full border border-outline-variant object-cover"
    />
  );
}

export function PublicCourseCard({ course }: PublicCourseCardProps) {
  const formattedPublished = course.publishedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(course.publishedAt))
    : null;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-outline-variant bg-surface-container-high">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-container/20">
            <svg
              className="h-12 w-12 text-primary/50"
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
          {course.category && <CategoryBadge category={course.category} />}
        </div>
        <h3 className="mt-1 line-clamp-1 text-lg font-bold tracking-tight text-on-surface group-hover:text-primary">
          {course.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">
          {course.description || "A structured course from InsideJibon."}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-outline-variant pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <TeacherAvatar course={course} />
            <span className="truncate text-xs font-medium text-on-surface">
              {course.teacher.name || "InsideJibon Teacher"}
            </span>
          </div>
          {formattedPublished && (
            <span className="shrink-0 text-[11px] text-outline">
              {formattedPublished}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs font-medium text-secondary">
          <span className="flex items-center gap-1.5">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            {course.moduleCount} {course.moduleCount === 1 ? "Module" : "Modules"}
          </span>
          <span className="flex items-center gap-1.5">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            {course.lessonCount} {course.lessonCount === 1 ? "Lesson" : "Lessons"}
          </span>
        </div>
      </div>
    </Link>
  );
}