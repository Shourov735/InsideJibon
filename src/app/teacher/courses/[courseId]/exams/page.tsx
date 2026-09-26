import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseById } from "@/services/courses";
import { getTeacherExams } from "@/services/exams";
import { ExamCard } from "@/components/teacher/exams/exam-card";
import { getTranslator } from "@/i18n/server";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { Button } from "@/components/shared/ui/button";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import {
  ChevronRightIcon,
  TrophyIcon,
  PlusIcon,
  ClipboardIcon,
} from "@/components/shared/ui/icons";

interface TeacherCourseExamsPageProps {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({
  params,
}: TeacherCourseExamsPageProps): Promise<Metadata> {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const course = await getTeacherCourseById(teacher.id, courseId);
  return {
    title: course ? `${course.title} — Examinations | Educator` : "Course Not Found",
  };
}

export default async function TeacherCourseExamsPage({
  params,
}: TeacherCourseExamsPageProps) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const t = await getTranslator();
  const course = await getTeacherCourseById(teacher.id, courseId);

  if (!course) notFound();

  const examsList = await getTeacherExams(teacher.id, course.id);

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
        <span className="font-medium text-ink-700">{t("teacher.exams.title")}</span>
      </nav>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <TrophyIcon size={14} />
            {t("teacher.courseExams.badge")}
          </span>
        }
        title={t("teacher.courseExams.title", { course: course.title })}
        description={t("teacher.courseExams.subtitle")}
        actions={
          <Link href={`/teacher/exams/new?courseId=${course.id}`}>
            <Button variant="primary" size="md" leadingIcon={<PlusIcon size={14} />}>
              {t("teacher.courseExams.create")}
            </Button>
          </Link>
        }
      />

      <div className="mt-6">
        {examsList.length === 0 ? (
          <EmptyState
            icon={<ClipboardIcon size={20} />}
            title={t("teacher.courseExams.emptyTitle")}
            description={t("teacher.courseExams.emptyDesc")}
            action={
              <Link href={`/teacher/exams/new?courseId=${course.id}`}>
                <Button variant="primary" size="md" leadingIcon={<PlusIcon size={14} />}>
                  {t("teacher.courseExams.emptyCta", { course: course.title })}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {examsList.map((exam) => (
              <ExamCard key={exam.id} exam={exam} courseTitle={course.title} />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
