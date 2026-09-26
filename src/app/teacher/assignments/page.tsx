import Link from "next/link";
import { requireTeacher } from "@/lib/permissions";
import { getTeacherAssignments } from "@/services/assignments";
import { getTeacherCourses } from "@/services/courses";
import { AssignmentDirectory } from "@/components/teacher/assignments";
import { getTranslator } from "@/i18n/server";
import type { AssignmentStatus } from "@/services/assignments/assignments";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { Button } from "@/components/shared/ui/button";
import { ClipboardIcon, PlusIcon } from "@/components/shared/ui/icons";

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
    <Container className="py-6 sm:py-8" size="xl">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <ClipboardIcon size={14} />
            {t("teacher.assignments.badge")}
          </span>
        }
        title={t("teacher.assignments.title")}
        description={t("teacher.assignments.subtitle")}
        actions={
          <Link href="/teacher/assignments/new">
            <Button variant="primary" size="md" leadingIcon={<PlusIcon size={14} />}>
              {t("teacher.assignments.create")}
            </Button>
          </Link>
        }
      />

      <div className="mt-6">
        <AssignmentDirectory assignments={assignmentsList} courses={coursesList} />
      </div>
    </Container>
  );
}
