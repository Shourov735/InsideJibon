import Link from "next/link";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherExams } from "@/services/exams";
import { getTeacherCourses } from "@/services/courses";
import { ExamDirectory } from "@/components/teacher/exams/exam-directory";
import { getTranslator } from "@/i18n/server";
import type { ExamStatus } from "@/services/exams/exams";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { Button } from "@/components/shared/ui/button";
import { PlusIcon, TrophyIcon } from "@/components/shared/ui/icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Examination Management | InsideJibon Educator",
  description: "Create, manage and publish examinations for your courses.",
};

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; courseId?: string }>;
}

export default async function TeacherExamsPage({ searchParams }: PageProps) {
  const teacher = await requireTeacher();
  const t = await getTranslator();
  const params = await searchParams;

  const q = params.q ?? "";
  const status = params.status as ExamStatus | undefined;
  const courseId = params.courseId;

  const [examsList, coursesList] = await Promise.all([
    getTeacherExams(teacher.id, { q: q || undefined, status: status || undefined, courseId: courseId || undefined }),
    getTeacherCourses(teacher.id),
  ]);

  return (
    <Container className="py-6 sm:py-8" size="xl">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <TrophyIcon size={14} />
            {t("teacher.exams.badge")}
          </span>
        }
        title={t("teacher.exams.title")}
        description={t("teacher.exams.subtitle")}
        actions={
          <Link href="/teacher/exams/new">
            <Button variant="primary" size="md" leadingIcon={<PlusIcon size={14} />}>
              {t("teacher.exams.create")}
            </Button>
          </Link>
        }
      />

      <div className="mt-6">
        <ExamDirectory exams={examsList} courses={coursesList} />
      </div>
    </Container>
  );
}
