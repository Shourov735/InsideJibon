import Link from "next/link";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourses } from "@/services/courses";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { CourseCard } from "@/components/teacher/course-card";

export const metadata = {
  title: "Educator Dashboard | InsideJibon",
  description: "InsideJibon teacher control center and course overview.",
};

export default async function TeacherDashboardPage() {
  const teacher = await requireTeacher();
  const coursesList = await getTeacherCourses(teacher.id);

  const publishedCount = coursesList.filter(
    (c) => c.status === "published"
  ).length;
  const draftCount = coursesList.filter((c) => c.status === "draft").length;
  const totalLessons = coursesList.reduce((acc, c) => acc + c.lessonCount, 0);

  const recentCourses = coursesList.slice(0, 3);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="dashboard" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              Welcome back, {teacher.name ?? "Educator"}
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              InsideJibon Educator Portal — manage your curriculum, lesson materials, and published courses.
            </p>
          </div>

          <Link
            href="/teacher/courses/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Create Course</span>
          </Link>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Total Courses
              </span>
              <div className="rounded-lg bg-surface-container p-2 text-primary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold text-primary">
              {coursesList.length}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Published
              </span>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {publishedCount}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Drafts
              </span>
              <div className="rounded-lg bg-surface-container p-2 text-secondary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold text-secondary">
              {draftCount}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Total Lessons
              </span>
              <div className="rounded-lg bg-surface-container p-2 text-primary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold text-primary">
              {totalLessons}
            </p>
          </div>
        </div>

        {/* Recent Courses Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-on-surface">
              Recent Courses
            </h2>
            <Link
              href="/teacher/courses"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all courses ({coursesList.length}) →
            </Link>
          </div>

          {recentCourses.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
              <p className="text-sm text-secondary">
                You haven&apos;t created any courses yet.
              </p>
              <div className="mt-4">
                <Link
                  href="/teacher/courses/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-container transition-colors"
                >
                  Create Course
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}