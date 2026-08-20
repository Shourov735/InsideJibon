import Link from "next/link";

import { requireStudent } from "@/lib/permissions";
import { getStudentDashboard } from "@/services/learning";
import { StudentCourseCard } from "@/components/student/student-course-card";

export const dynamic = "force-dynamic";

export default async function StudentCoursesPage() {
  const user = await requireStudent();
  const courses = await getStudentDashboard(user.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          My Courses
        </h1>
        <p className="text-sm text-on-surface-variant">
          Courses you have enrolled in — pick up where you left off.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-high text-primary">
            <svg
              className="h-7 w-7"
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
          </div>
          <h2 className="mt-4 text-lg font-bold text-on-surface">
            No courses yet
          </h2>
          <p className="mt-1 text-sm text-secondary">
            Explore the catalog and enroll in your first course to start
            learning.
          </p>
          <Link
            href="/courses"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
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
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <StudentCourseCard key={course.courseId} course={course} />
          ))}
        </div>
      )}
    </main>
  );
}