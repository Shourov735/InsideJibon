import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireStudent } from "@/lib/permissions";
import { getAttemptResult, getStudentExamDetail } from "@/services/exams";
import { ExamResultView } from "@/components/student/exams/exam-result-view";
import { getTranslator } from "@/i18n/server";

interface ResultPageProps {
  params: Promise<{ courseId: string; examId: string }>;
  searchParams: Promise<{ attempt?: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: ResultPageProps): Promise<Metadata> {
  const { examId } = await params;
  if (!UUID_RE.test(examId)) return { title: "Exam Result" };
  const user = await requireStudent();
  const detail = await getStudentExamDetail(user.id, examId);
  return {
    title: detail ? `${detail.title} — Result & Performance` : "Exam Result",
  };
}

export default async function ResultPage({
  params,
  searchParams,
}: ResultPageProps) {
  const { courseId, examId } = await params;
  const { attempt: attemptParam } = await searchParams;
  const user = await requireStudent();
  const t = await getTranslator();

  let attemptId = attemptParam && UUID_RE.test(attemptParam) ? attemptParam : null;

  if (!attemptId) {
    const detail = await getStudentExamDetail(user.id, examId);
    if (!detail) notFound();
    const latest = [...detail.attempts]
      .reverse()
      .find((a) => a.status === "submitted");
    if (!latest) notFound();
    attemptId = latest.id;
  }

  const result = await getAttemptResult(user.id, attemptId);
  if (!result) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 space-y-6">
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
          href={`/student/courses/${courseId}/exams`}
          className="hover:text-primary transition-colors"
        >
          {t("student.exams.breadcrumb")}
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
          href={`/student/courses/${courseId}/exams/${examId}`}
          className="hover:text-primary transition-colors truncate max-w-xs"
        >
          {result.examTitle}
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
        <span className="text-on-surface font-semibold">{t("student.result.title")}</span>
      </nav>

      {/* Result Scorecard & Breakdown */}
      <ExamResultView result={result} courseId={courseId} />
    </main>
  );
}