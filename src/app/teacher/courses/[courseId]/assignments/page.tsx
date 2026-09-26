import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseById, getTeacherCourses } from "@/services/courses";
import { getTeacherAssignments } from "@/services/assignments";
import { AssignmentDirectory } from "@/components/teacher/assignments";
import { getTranslator } from "@/i18n/server";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { Button } from "@/components/shared/ui/button";
import { ChevronRightIcon, ClipboardIcon, PlusIcon } from "@/components/shared/ui/icons";

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
    <Container className="py-6 sm:py-8" size="xl">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-ink-500">
        <Link href="/teacher/courses" className="hover:text-ink-900 transition-colors">
          {t("teacher.courseForm.breadcrumb.courses")}
        </Link>
        <ChevronRightIcon size={12} />
        <Link
          href={`/teacher/courses/${course.id}`}
          className="max-w-[160px] truncate hover:text-ink-900 transition-colors"
        >
          {course.title}
        </Link>
        <ChevronRightIcon size={12} />
        <span className="font-medium text-ink-700">
          {t("teacher.assignments.title")}
        </span>
      </nav>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <ClipboardIcon size={14} />
            {t("teacher.courseAssignments.badge")}
          </span>
        }
        title={t("teacher.courseAssignments.title", { course: course.title })}
        description={t("teacher.courseAssignments.subtitle")}
        actions={
          <Link href={`/teacher/courses/${courseId}/assignments/new`}>
            <Button variant="primary" size="md" leadingIcon={<PlusIcon size={14} />}>
              {t("teacher.courseAssignments.create")}
            </Button>
          </Link>
        }
      />

      <div className="mt-6">
        <AssignmentDirectory
          assignments={assignmentsList}
          courses={coursesList}
          scopedCourseId={courseId}
        />
      </div>
    </Container>
  );
}
