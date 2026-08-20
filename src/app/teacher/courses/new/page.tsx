import Link from "next/link";

import { requireTeacher } from "@/lib/permissions";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { CourseForm } from "@/components/teacher/course-form";

export const metadata = {
  title: "Create Course | InsideJibon Educator",
  description: "Create a new course and begin structuring your curriculum.",
};

export default async function NewCoursePage() {
  const teacher = await requireTeacher();

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="new" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs font-medium text-secondary">
          <Link
            href="/teacher/courses"
            className="hover:text-on-surface hover:underline"
          >
            Courses
          </Link>
          <svg
            className="h-3 w-3 text-outline"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="text-on-surface">New Course</span>
        </div>

        <div className="mt-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs">
          <div className="border-b border-outline-variant pb-5">
            <h1 className="text-xl font-bold tracking-tight text-on-surface">
              Create New Course
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Provide basic course information. You can add modules, lessons, reading notes, and videos in the next step.
            </p>
          </div>

          <div className="mt-6">
            <CourseForm mode="create" />
          </div>
        </div>
      </main>
    </div>
  );
}
