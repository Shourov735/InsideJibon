import Link from "next/link";

import { requireStudent } from "@/lib/permissions";
import { getStudentDashboard } from "@/services/learning";
import { StudentCourseCard } from "@/components/student/student-course-card";
import { ProgressBar } from "@/components/student/progress-bar";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await requireStudent();
  const courses = await getStudentDashboard(user.id);

  const sortedByAccess = [...courses].sort((a, b) => {
    const ta = a.lastLesson?.lastAccessedAt?.getTime() ?? 0;
    const tb = b.lastLesson?.lastAccessedAt?.getTime() ?? 0;
    return tb - ta;
  });

  const continueCourse = sortedByAccess[0] ?? null;
  const continueHref = continueCourse?.lastLesson
    ? `/student/courses/${continueCourse.courseId}/learn?lesson=${continueCourse.lastLesson.id}`
    : continueCourse
      ? `/student/courses/${continueCourse.courseId}/learn`
      : null;

  const completedCount = courses.filter((c) => c.completedAt).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          শুভেচ্ছা, {user.name?.split(" ")[0] || "শিক্ষার্থী"} 👋
        </h1>
        <p className="text-sm text-on-surface-variant">
          Welcome back — here is where your learning lives.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Enrolled Courses
          </span>
          <p className="mt-1 text-3xl font-bold text-primary">{courses.length}</p>
        </div>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Completed Courses
          </span>
          <p className="mt-1 text-3xl font-bold text-primary">{completedCount}</p>
        </div>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Overall Progress
          </span>
          <p className="mt-1 text-3xl font-bold text-primary">
            {courses.length === 0
              ? "—"
              : `${Math.round(
                  courses.reduce((acc, c) => acc + c.progress.percent, 0) /
                    courses.length
                )}%`}
          </p>
        </div>
      </div>

      {continueCourse ? (
        <section className="mt-10">
          <h2 className="text-lg font-bold tracking-tight text-on-surface">
            Continue Learning
          </h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs">
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container/20 text-primary">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-on-surface">
                    {continueCourse.title}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-secondary">
                    {continueCourse.lastLesson
                      ? `Resume: ${continueCourse.lastLesson.title}`
                      : "Start from the beginning"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="hidden w-40 sm:block">
                  <ProgressBar percent={continueCourse.progress.percent} />
                </div>
                <span className="text-sm font-bold text-primary">
                  {continueCourse.progress.percent}%
                </span>
                {continueHref && (
                  <Link
                    href={continueHref}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
                  >
                    Continue
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-10">
          <h2 className="text-lg font-bold tracking-tight text-on-surface">
            Get Started
          </h2>
          <div className="mt-4 rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
            <p className="text-sm text-on-surface-variant">
              You are not enrolled in any courses yet.
            </p>
            <Link
              href="/courses"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
            >
              Browse Courses
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
      )}

      <section className="mt-10 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-on-surface">
            My Courses
          </h2>
          {courses.length > 0 && (
            <Link
              href="/student/courses"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          )}
        </div>
        {courses.length === 0 ? null : (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <StudentCourseCard key={course.courseId} course={course} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}