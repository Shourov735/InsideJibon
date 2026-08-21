import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseById, getTeacherCourses } from "@/services/courses";
import { getTeacherAssignments } from "@/services/assignments";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { AssignmentDirectory } from "@/components/teacher/assignments";
import { getTranslator } from "@/i18n/server";

interface CourseAssignmentsPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function TeacherCourseAssignmentsPage({ params }: CourseAssignmentsPageProps) {
  const teacher = await requireTeacher();
  const t = await getTranslator();
  const { courseId } = await params;

  const [course, assignmentsList, coursesList] = await Promise.all([
    getTeacherCourseById(teacher.id, courseId),
    getTeacherAssignments(teacher.id, courseId),
    getTeacherCourses(teacher.id),
  ]);

  if (!course) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="courses" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                {t("teacher.courseAssignments.badge")}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              {t("teacher.courseAssignments.title", { course: course.title })}
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant max-w-2xl">
              {t("teacher.courseAssignments.subtitle")}
            </p>
          </div>

          <Link
            href={`/teacher/courses/${courseId}/assignments/new`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container shrink-0"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t("teacher.courseAssignments.create")}</span>
          </Link>
        </div>

        {/* Directory Dashboard Scoped to this Course */}
        <AssignmentDirectory
          assignments={assignmentsList}
          courses={coursesList}
          scopedCourseId={courseId}
        />
      </main>
    </div>
  );
}
