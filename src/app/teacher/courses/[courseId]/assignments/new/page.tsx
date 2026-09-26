import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/permissions";
import {
  getTeacherCourseById,
  getTeacherCourses,
  getTeacherCourseWithCurriculum,
} from "@/services/courses";
import { AssignmentForm } from "@/components/teacher/assignments";
import { getTranslator } from "@/i18n/server";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { ChevronRightIcon, ClipboardIcon } from "@/components/shared/ui/icons";

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
    <Container className="py-6 sm:py-8" size="lg">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-ink-500">
        <Link
          href={`/teacher/courses/${courseId}`}
          className="max-w-[160px] truncate hover:text-ink-900 transition-colors"
        >
          {course.title}
        </Link>
        <ChevronRightIcon size={12} />
        <Link
          href={`/teacher/courses/${courseId}/assignments`}
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
        description={course.title}
      />

      <div className="mt-6">
        <AssignmentForm
          courses={coursesList}
          preselectedCourseId={courseId}
          courseLessons={courseLessons}
        />
      </div>
    </Container>
  );
}
