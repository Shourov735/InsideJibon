import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourses, getTeacherCourseWithCurriculum } from "@/services/courses";
import { AssignmentForm } from "@/components/teacher/assignments";
import { getTranslator } from "@/i18n/server";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { ChevronRightIcon, ClipboardIcon } from "@/components/shared/ui/icons";

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
    <Container className="py-6 sm:py-8" size="lg">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-ink-500">
        <Link
          href="/teacher/assignments"
          className="hover:text-ink-900 transition-colors"
        >
          {t("teacher.assignmentForm.breadcrumb.assignments")}
        </Link>
        <ChevronRightIcon size={12} />
        <span className="font-medium text-ink-700">
          {t("teacher.assignmentForm.breadcrumb.new")}
        </span>
      </nav>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <ClipboardIcon size={14} />
            {t("teacher.assignmentForm.badge")}
          </span>
        }
        title={t("teacher.assignmentForm.title")}
        description={t("teacher.assignmentForm.subtitle")}
      />

      <div className="mt-6">
        <AssignmentForm
          courses={coursesList}
          preselectedCourseId={activeCourseId}
          courseLessons={courseLessons}
        />
      </div>
    </Container>
  );
}
