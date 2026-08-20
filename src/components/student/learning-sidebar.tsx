import Link from "next/link";

import type { LearningCourse } from "@/types/learning";

interface LearningSidebarProps {
  course: LearningCourse;
  courseId: string;
  activeLessonId: string | null;
}

/**
 * Curriculum navigation for the learning workspace. Server component — links
 * point at `/student/courses/[courseId]/learn?lesson=<id>`.
 */
export function LearningSidebar({
  course,
  courseId,
  activeLessonId,
}: LearningSidebarProps) {
  return (
    <nav
      aria-label="Course curriculum"
      className="flex h-full w-full flex-col bg-surface-container-lowest"
    >
      <div className="border-b border-outline-variant p-4">
        <h2 className="line-clamp-1 text-sm font-bold text-on-surface">
          {course.title}
        </h2>
        <p className="mt-1 text-xs text-secondary">
          {course.progress.completed} of {course.progress.total} lessons ·{" "}
          {course.progress.percent}%
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <Link
          href={`/student/courses/${courseId}/exams`}
          className="flex items-center justify-between border-l-2 border-transparent px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low hover:text-primary group"
        >
          <div className="flex items-center gap-2.5">
            <svg
              className="h-[18px] w-[18px] text-outline group-hover:text-primary transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>Course Examinations</span>
          </div>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
            Tests
          </span>
        </Link>
        {course.modules.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-secondary">
            No lessons yet.
          </p>
        ) : (
          course.modules.map((mod) => (
            <div key={mod.id} className="mb-2">
              <div className="flex items-center justify-between px-4 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  Module {mod.position}: {mod.title}
                </h3>
              </div>
              <ul className="space-y-0.5">
                {mod.lessons.map((lesson) => {
                  const href = `/student/courses/${courseId}/learn?lesson=${lesson.id}`;
                  const isActive = lesson.id === activeLessonId;
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={href}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex items-start gap-2.5 border-l-2 px-4 py-2.5 transition-colors ${
                          isActive
                            ? "border-primary bg-secondary-container/30"
                            : "border-transparent hover:bg-surface-container-low"
                        }`}
                      >
                        <span
                          className={`mt-0.5 shrink-0 ${
                            lesson.completed
                              ? "text-primary"
                              : isActive
                                ? "text-primary"
                                : "text-outline"
                          }`}
                        >
                          {lesson.completed ? (
                            <svg
                              className="h-[18px] w-[18px]"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          ) : isActive ? (
                            <svg
                              className="h-[18px] w-[18px]"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          ) : (
                            <svg
                              className="h-[18px] w-[18px]"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="9" />
                              <path d="M12 7v5l3 2" />
                            </svg>
                          )}
                        </span>
                        <span
                          className={`min-w-0 text-sm leading-snug ${
                            isActive
                              ? "font-semibold text-primary"
                              : lesson.completed
                                ? "text-secondary"
                                : "text-on-surface"
                          }`}
                        >
                          <span className="mr-1 font-mono text-[11px] text-outline">
                            {mod.position}.{lesson.position}
                          </span>
                          {lesson.title}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </nav>
  );
}