import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireTeacher } from "@/lib/permissions";
import { getTeacherAssignmentById } from "@/services/assignments";
import { getTeacherCourses, getTeacherCourseWithCurriculum } from "@/services/courses";
import { AssignmentForm } from "@/components/teacher/assignments";
import { getTranslator } from "@/i18n/server";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { ChevronRightIcon, ClipboardIcon } from "@/components/shared/ui/icons";

interface EditAssignmentPageProps {
  params: Promise<{ assignmentId: string }>;
}

export default async function EditAssignmentPage({ params }: EditAssignmentPageProps) {
  const teacher = await requireTeacher();
  const t = await getTranslator();
  const { assignmentId } = await params;

  const assignment = await getTeacherAssignmentById(teacher.id, assignmentId);
  if (!assignment) {
    notFound();
  }

  // Only draft assignments can be structurally edited
  if (assignment.status !== "draft") {
    redirect(`/teacher/assignments/${assignment.id}`);
  }

  const [coursesList, courseCurriculum] = await Promise.all([
    getTeacherCourses(teacher.id),
    getTeacherCourseWithCurriculum(teacher.id, assignment.courseId),
  ]);

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
    <Container className="py-6 sm:py-8" size="lg">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-ink-500">
        <Link
          href="/teacher/assignments"
          className="hover:text-ink-900 transition-colors"
        >
          {t("teacher.assignmentForm.breadcrumb.assignments")}
        </Link>
        <ChevronRightIcon size={12} />
        <Link
          href={`/teacher/assignments/${assignment.id}`}
          className="max-w-[160px] truncate hover:text-ink-900 transition-colors"
        >
          {assignment.title}
        </Link>
        <ChevronRightIcon size={12} />
        <span className="font-medium text-ink-700">
          {t("teacher.assignmentForm.breadcrumb.settings")}
        </span>
      </nav>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <ClipboardIcon size={14} />
            {t("teacher.assignmentForm.badge")}
          </span>
        }
        title={t("teacher.assignmentForm.titleEdit")}
        description={t("teacher.assignmentForm.subtitleEdit")}
      />

      <div className="mt-6">
        <AssignmentForm
          initialData={assignment}
          courses={coursesList}
          preselectedCourseId={assignment.courseId}
          courseLessons={courseLessons}
        />
      </div>
    </Container>
  );
}
