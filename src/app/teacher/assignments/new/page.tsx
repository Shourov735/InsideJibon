import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourses, getTeacherCourseWithCurriculum } from "@/services/courses";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { AssignmentForm } from "@/components/teacher/assignments";
import { getTranslator } from "@/i18n/server";

export const metadata = {
  title: "Create Assignment | InsideJibon Educator",
  description: "Create a new assignment with deadlines, grading points, and accepted file types.",
};

interface NewAssignmentPageProps {
  searchParams: Promise<{ courseId?: string }>;
}

export default async function NewAssignmentPage({ searchParams }: NewAssignmentPageProps) {
  const teacher = await requireTeacher();
  const t = await getTranslator();
  const { courseId } = await searchParams;

  const coursesList = await getTeacherCourses(teacher.id);

  if (coursesList.length === 0) {
    redirect("/teacher/courses/new");
  }

  // Pre-selected course or first available course
  const activeCourseId = courseId && coursesList.some((c) => c.id === courseId)
    ? courseId
    : coursesList[0]?.id;

  let courseLessons: { id: string; title: string; moduleTitle?: string }[] = [];

  if (activeCourseId) {
    const courseCurriculum = await getTeacherCourseWithCurriculum(teacher.id, activeCourseId);
    if (courseCurriculum) {
      courseLessons = courseCurriculum.modules.flatMap((mod) =>
        mod.lessons.map((les) => ({
          id: les.id,
          title: les.title,
          moduleTitle: mod.title,
        }))
      );
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="assignments" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-secondary">
          <Link
            href="/teacher/assignments"
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
            {t("teacher.assignmentForm.subtitle")}
          </p>
        </div>

        {/* Creation Form */}
        <AssignmentForm
          courses={coursesList}
          preselectedCourseId={activeCourseId}
          courseLessons={courseLessons}
        />
      </main>
    </div>
  );
}
