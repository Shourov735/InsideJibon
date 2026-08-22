import Link from "next/link";
import { requireTeacher } from "@/lib/permissions";
import { getTeacherAssignments } from "@/services/assignments";
import { getTeacherCourses } from "@/services/courses";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { AssignmentDirectory } from "@/components/teacher/assignments";
import { getTranslator } from "@/i18n/server";
import type { AssignmentStatus } from "@/services/assignments/assignments";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Assignment Management | InsideJibon Educator",
  description: "Create, manage and grade assignments across your courses.",
};

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; courseId?: string }>;
}

export default async function TeacherAssignmentsPage({ searchParams }: PageProps) {
  const teacher = await requireTeacher();
  const t = await getTranslator();
  const params = await searchParams;

  const q = params.q ?? "";
  const status = params.status as AssignmentStatus | undefined;
  const courseId = params.courseId;

  const [assignmentsList, coursesList] = await Promise.all([
    getTeacherAssignments(teacher.id, {
      q: q || undefined,
      status: status || undefined,
      courseId: courseId || undefined,
    }),
    getTeacherCourses(teacher.id),
  ]);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="assignments" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                {t("teacher.assignments.badge")}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              {t("teacher.assignments.title")}
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant max-w-2xl">
              {t("teacher.assignments.subtitle")}
            </p>
          </div>

          <Link
            href="/teacher/assignments/new"
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
            <span>{t("teacher.assignments.create")}</span>
          </Link>
        </div>

        {/* Directory Dashboard */}
        <AssignmentDirectory assignments={assignmentsList} courses={coursesList} />
      </main>
    </div>
  );
}
