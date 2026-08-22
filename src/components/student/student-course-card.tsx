import Link from "next/link";
import { getTranslator } from "@/i18n/server";
import type { StudentCourseSummary } from "@/types/learning";

interface StudentCourseCardProps {
  course: StudentCourseSummary;
}

export async function StudentCourseCard({ course }: StudentCourseCardProps) {
  const t = await getTranslator();
  const learnHref = `/student/courses/${course.courseId}/learn`;
  const resumeHref = course.lastLesson
    ? `${learnHref}?lesson=${course.lastLesson.id}`
    : learnHref;

  const status = course.completedAt 
    ? "Completed" 
    : (course.progress.percent > 0 ? "In Progress" : "Not Started");

  const statusColor = course.completedAt
    ? "bg-emerald-500 text-white"
    : (course.progress.percent > 0 ? "bg-amber-500 text-white" : "bg-secondary text-white");

  const lastAccessed = course.lastLesson?.lastAccessedAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(course.lastLesson.lastAccessedAt))
    : "Never";

  return (
    <Link
      href={resumeHref}
      className="bento-card group flex flex-col overflow-hidden"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-surface-container-high border-b border-outline-variant">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-container/10">
            <svg
              className="h-10 w-10 text-primary/30"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-80"></div>
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm ${statusColor}`}>
            {status}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold tracking-tight text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
          {course.title}
        </h3>
        
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-semibold text-secondary">
            <span>Lesson {course.progress.completed} of {course.progress.total}</span>
            <span>{course.progress.percent}%</span>
          </div>
          <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${course.progress.percent}%` }}
            />
          </div>
          <span className="text-[10px] text-secondary mt-1">Last accessed: {lastAccessed}</span>
        </div>

        <div className="mt-5 border-t border-outline-variant pt-4 flex items-center justify-between">
          <span className="truncate text-xs font-semibold text-on-surface flex-1 mr-2">
            {course.teacherName ?? "InsideJibon"}
          </span>
          <button className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-container px-4 py-2 text-xs font-bold text-on-primary-container shadow-sm group-hover:bg-primary group-hover:text-on-primary transition-colors">
            {course.lastLesson ? "Continue" : "Start"}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </Link>
  );
}