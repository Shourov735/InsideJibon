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
      className="h-6 w-6 rounded-full border border-outline-variant object-cover"
    />
  );
}

export function PublicCourseCard({ course }: PublicCourseCardProps) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="bento-card group flex flex-col overflow-hidden"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-container-high border-b border-outline-variant">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-container/10">
            <svg
              className="h-12 w-12 text-primary/30"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60"></div>
        
        {course.category && (
          <div className="absolute top-3 right-3">
             <CategoryBadge category={course.category} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold tracking-tight text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
          {course.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">
          {course.description || "A structured course from InsideJibon."}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-outline-variant pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <TeacherAvatar course={course} />
            <span className="truncate text-xs font-semibold text-on-surface">
              {course.teacher.name || "Tanvir Hasan Jibon"}
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-xs font-semibold text-secondary">
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {course.moduleCount}
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {course.lessonCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}