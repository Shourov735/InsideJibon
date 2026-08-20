import Link from "next/link";
import { notFound } from "next/navigation";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseById } from "@/services/courses";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { CourseForm } from "@/components/teacher/course-form";
import { CourseDangerZone } from "@/components/teacher/course-danger-zone";

interface EditCoursePageProps {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({ params }: EditCoursePageProps) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const course = await getTeacherCourseById(teacher.id, courseId);

  if (!course) return { title: "Course Not Found" };

  return {
    title: `Settings: ${course.title} | InsideJibon Educator`,
    description: "Edit course details and settings.",
  };
}

export default async function EditCoursePage({
  params,
}: EditCoursePageProps) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const course = await getTeacherCourseById(teacher.id, courseId);

  if (!course) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="courses" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 space-y-8">
        {/* Breadcrumb */}
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
          <Link
            href={`/teacher/courses/${course.id}`}
            className="hover:text-on-surface hover:underline truncate max-w-xs"
          >
            {course.title}
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
          <span className="text-on-surface">Settings</span>
        </div>

        {/* Edit Form */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs">
          <div className="border-b border-outline-variant pb-5">
            <h1 className="text-xl font-bold tracking-tight text-on-surface">
              Course Settings & Metadata
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Update the title, URL slug, description, and thumbnail for this course.
            </p>
          </div>

          <div className="mt-6">
            <CourseForm initialCourse={course} mode="edit" />
          </div>
        </div>

        {/* Danger Zone */}
        <CourseDangerZone course={course} />
      </main>
    </div>
  );
}
