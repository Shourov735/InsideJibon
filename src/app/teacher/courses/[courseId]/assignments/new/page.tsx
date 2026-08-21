import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/permissions";
import {
  getTeacherCourseById,
  getTeacherCourses,
  getTeacherCourseWithCurriculum,
} from "@/services/courses";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { AssignmentForm } from "@/components/teacher/assignments";
import { getTranslator } from "@/i18n/server";

interface CourseNewAssignmentPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CourseNewAssignmentPage({ params }: CourseNewAssignmentPageProps) {
  const teacher = await requireTeacher();
  const t = await getTranslator();
  const { courseId } = await params;

  const [course, coursesList, courseCurriculum] = await Promise.all([
    getTeacherCourseById(teacher.id, courseId),
    getTeacherCourses(teacher.id),
    getTeacherCourseWithCurriculum(teacher.id, courseId),
  ]);

  if (!course) {
    notFound();
  }

  let courseLessons: { id: string; title: string; moduleTitle?: string }[] = [];
  if (courseCurriculum) {
    courseLessons = courseCurriculum.modules.flatMap((mod) =>
      mod.lessons.map((les) => ({
        id: les.id,
        title: les.title,
        moduleTitle: mod.title,
      }))
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="courses" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-secondary">
          <Link
            href={`/teacher/courses/${courseId}`}
            className="hover:text-primary transition-colors truncate max-w-xs"
          >
            {course.title}
          </Link>
          <span className="text-outline">/</span>
          <Link
            href={`/teacher/courses/${courseId}/assignments`}
            className="hover:text-primary transition-colors"
          >
            {t("teacher.assignmentForm.breadcrumb.assignments")}
          </Link>
          <span className="text-outline">/</span>
          <span className="text-on-surface font-semibold">
            {t("teacher.assignmentForm.breadcrumb.new")}
          </span>
        </div>

        {/* Page Title */}
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              {t("teacher.assignmentForm.badge")}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {t("teacher.assignmentForm.title")}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {course.title}
          </p>
        </div>

        {/* Form */}
        <AssignmentForm
          courses={coursesList}
          preselectedCourseId={courseId}
          courseLessons={courseLessons}
        />
      </main>
    </div>
  );
}
