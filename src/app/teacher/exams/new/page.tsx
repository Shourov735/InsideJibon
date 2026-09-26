import Link from "next/link";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourses } from "@/services/courses";
import { ExamForm } from "@/components/teacher/exams/exam-form";
import { getTranslator } from "@/i18n/server";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { Button } from "@/components/shared/ui/button";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { ChevronRightIcon, TrophyIcon, PlusIcon, BookIcon } from "@/components/shared/ui/icons";

export const metadata = {
  title: "Create Exam | InsideJibon Educator",
  description: "Create a new examination for one of your courses.",
};

interface NewExamPageProps {
  searchParams: Promise<{ courseId?: string }>;
}

export default async function NewExamPage({ searchParams }: NewExamPageProps) {
  const { courseId } = await searchParams;
  const teacher = await requireTeacher();
  const t = await getTranslator();
  const coursesList = await getTeacherCourses(teacher.id);

  return (
    <Container className="py-6 sm:py-8" size="lg">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-ink-500">
        <Link href="/teacher/exams" className="hover:text-ink-900 transition-colors">
          {t("teacher.examForm.breadcrumb.exams")}
        </Link>
        <ChevronRightIcon size={12} />
        <span className="font-medium text-ink-700">
          {t("teacher.examForm.breadcrumb.new")}
        </span>
      </nav>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <TrophyIcon size={14} />
            {t("teacher.examForm.breadcrumb.exams")}
          </span>
        }
        title={t("teacher.examForm.title")}
        description={t("teacher.examForm.subtitle")}
      />

      <div className="mt-6">
        {coursesList.length === 0 ? (
          <EmptyState
            icon={<BookIcon size={20} />}
            title={t("teacher.examForm.courseRequired")}
            description={t("teacher.examForm.courseRequiredDesc")}
            action={
              <Link href="/teacher/courses/new">
                <Button variant="primary" size="md" leadingIcon={<PlusIcon size={14} />}>
                  {t("teacher.examForm.createCourseFirst")}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="rounded-3xl border border-outline-variant bg-surface-0 p-5 sm:p-8">
            <ExamForm
              mode="create"
              courses={coursesList}
              initialCourseId={courseId}
            />
          </div>
        )}
      </div>
    </Container>
  );
}
