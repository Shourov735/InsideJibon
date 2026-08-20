import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireStudent } from "@/lib/permissions";
import { getStudentCourseExams } from "@/services/exams";
import { getLearningCourse } from "@/services/learning";
import { StudentExamCard } from "@/components/student/exams/student-exam-card";
import { getTranslator } from "@/i18n/server";

interface ExamsListPageProps {
  params: Promise<{ courseId: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: ExamsListPageProps): Promise<Metadata> {
  const { courseId } = await params;
  if (!UUID_RE.test(courseId)) return { title: "Course Not Found" };
  const user = await requireStudent();
  const course = await getLearningCourse(user.id, courseId);
  return { title: course ? `${course.title} — Examinations` : "Course Not Found" };
}

export default async function CourseExamsPage({ params }: ExamsListPageProps) {
  const { courseId } = await params;
  const user = await requireStudent();
  const t = await getTranslator();

  const course = await getLearningCourse(user.id, courseId);
  if (!course) notFound();

  const examsList = await getStudentCourseExams(user.id, courseId);
  if (!examsList) notFound();

  const totalExams = examsList.length;
  const inProgressExams = examsList.filter((e) => Boolean(e.inProgressAttemptId)).length;
  const completedExams = examsList.filter((e) => e.attemptsUsed > 0).length;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-secondary">
        <Link href="/student" className="hover:text-primary transition-colors">
          {t("nav.student.dashboard")}
        </Link>
        <svg
          className="h-3 w-3 text-outline"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <Link
          href="/student/courses"
          className="hover:text-primary transition-colors"
        >
          {t("nav.student.courses")}
        </Link>
        <svg
          className="h-3 w-3 text-outline"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <Link
          href={`/student/courses/${courseId}/learn`}
          className="hover:text-primary transition-colors truncate max-w-xs"
        >
          {course.title}
        </Link>
        <svg
          className="h-3 w-3 text-outline"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-on-surface font-semibold">{t("student.exams.breadcrumb")}</span>
      </nav>

      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              {t("student.exams.badge")}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {t("student.exams.title", { course: course.title })}
          </h1>
          <p className="text-sm text-on-surface-variant max-w-2xl">
            {t("student.exams.subtitle")}
          </p>
        </div>

        <Link
          href={`/student/courses/${courseId}/learn`}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container hover:text-primary shrink-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{t("student.exams.returnToLessons")}</span>
        </Link>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs text-center sm:text-left">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("student.exams.summary.available")}
          </span>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-primary">{totalExams}</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs text-center sm:text-left">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-800">
            {t("student.exams.summary.inProgress")}
          </span>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-amber-700">{inProgressExams}</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs text-center sm:text-left">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-800">
            {t("student.exams.summary.attempted")}
          </span>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-emerald-700">{completedExams}</p>
        </div>
      </div>

      {/* Examinations Cards List */}
      <div className="space-y-4">
        {examsList.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center shadow-xs space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-on-surface">{t("student.exams.emptyTitle")}</h3>
            <p className="mx-auto max-w-sm text-xs text-secondary">
              {t("student.exams.emptyDesc")}
            </p>
            <div className="pt-2">
              <Link
                href={`/student/courses/${courseId}/learn`}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
              >
                <span>{t("student.exams.goToCurriculum")}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {examsList.map((exam) => (
              <StudentExamCard
                key={exam.id}
                exam={exam}
                courseId={courseId}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}