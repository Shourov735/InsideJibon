import Link from "next/link";
import { notFound } from "next/navigation";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherExamById } from "@/services/exams";
import { getTeacherCourseById } from "@/services/courses";
import { ExamForm } from "@/components/teacher/exams/exam-form";
import { getTranslator } from "@/i18n/server";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { ChevronRightIcon, TrophyIcon } from "@/components/shared/ui/icons";

interface ExamEditPageProps {
  params: Promise<{ examId: string }>;
}

export async function generateMetadata({ params }: ExamEditPageProps) {
  const { examId } = await params;
  const teacher = await requireTeacher();
  const exam = await getTeacherExamById(teacher.id, examId);

  if (!exam) return { title: "Edit Exam | Not Found" };

  return {
    title: `Edit: ${exam.title} | InsideJibon Educator`,
    description: `Update settings for ${exam.title}`,
  };
}

export default async function ExamEditPage({ params }: ExamEditPageProps) {
  const { examId } = await params;
  const teacher = await requireTeacher();
  const exam = await getTeacherExamById(teacher.id, examId);

  if (!exam) notFound();

  const t = await getTranslator();

  const course = await getTeacherCourseById(teacher.id, exam.courseId);

  return (
    <Container className="py-6 sm:py-8" size="lg">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-ink-500">
        <Link href="/teacher/exams" className="hover:text-ink-900 transition-colors">
          {t("teacher.examForm.breadcrumb.exams")}
        </Link>
        <ChevronRightIcon size={12} />
        <Link
          href={`/teacher/exams/${exam.id}`}
          className="max-w-[160px] truncate hover:text-ink-900 transition-colors"
        >
          {exam.title}
        </Link>
        <ChevronRightIcon size={12} />
        <span className="font-medium text-ink-700">
          {t("teacher.examForm.breadcrumb.settings")}
        </span>
      </nav>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <TrophyIcon size={14} />
            {t("teacher.examForm.breadcrumb.exams")}
          </span>
        }
        title={t("teacher.examForm.titleEditSettings")}
        description={t("teacher.examForm.settingsDesc")}
      />

      <div className="mt-6 rounded-3xl border border-outline-variant bg-surface-0 p-5 sm:p-8">
        <ExamForm mode="edit" exam={exam} associatedCourse={course} />
      </div>
    </Container>
  );
}
