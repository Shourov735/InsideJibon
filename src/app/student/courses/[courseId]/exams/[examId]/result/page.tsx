import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireStudent } from "@/lib/permissions";
import { getAttemptResult, getStudentExamDetail } from "@/services/exams";

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
    title: detail ? `${detail.title} — Result` : "Exam Result",
  };
}

export default async function ResultPage({
  params,
  searchParams,
}: ResultPageProps) {
  const { courseId, examId } = await params;
  const { attempt: attemptParam } = await searchParams;
  const user = await requireStudent();

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
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-2 text-xs font-medium text-secondary">
        <Link href="/student" className="hover:text-primary hover:underline">
          Dashboard
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
          className="hover:text-primary hover:underline"
        >
          Exams
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
          className="hover:text-primary hover:underline"
        >
          {result.examTitle}
        </Link>
      </nav>

      <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-center sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">
          Attempt {result.attemptNumber} · Submitted{" "}
          {new Date(result.submittedAt).toLocaleString()}
        </p>
        <p className="mt-3 text-5xl font-black tracking-tight text-primary">
          {result.percentage}%
        </p>
        <p className="mt-2 text-sm font-medium text-on-surface">
          {result.score} out of {result.totalPoints} marks
        </p>
        <div className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full bg-surface-container-high">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${result.percentage}%` }}
          />
        </div>
        <div className="mt-6">
          <Link
            href={`/student/courses/${courseId}/exams/${examId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
          >
            Back to Exam
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <h2 className="text-sm font-bold text-on-surface">Answer review</h2>
        {result.questions.map((question) => {
          return (
            <div
              key={question.questionId}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-semibold text-on-surface">
                  <span className="mr-2 font-mono text-xs text-outline">
                    Q{question.position}
                  </span>
                  {question.questionText}
                </h3>
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                      question.isCorrect
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {question.awardedPoints}/{question.marks}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                {question.options.map((option) => {
                  const isSelected = option.id === question.selectedOptionId;
                  const isCorrect = option.id === question.correctOptionId;
                  let style =
                    "border-outline-variant text-on-surface-variant";
                  if (isCorrect) style = "border-emerald-300 text-emerald-800";
                  else if (isSelected)
                    style = "border-red-300 text-red-700";
                  return (
                    <div
                      key={option.id}
                      className={`rounded-lg border p-2.5 text-sm ${style} ${
                        isSelected || isCorrect ? "bg-surface-container-low" : ""
                      }`}
                    >
                      <span className="mr-2">
                        {isCorrect ? "✓" : isSelected ? "✗" : "•"}
                      </span>
                      {option.optionText}
                      {isSelected && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-secondary">
                          your answer
                        </span>
                      )}
                      {isCorrect && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-secondary">
                          correct
                        </span>
                      )}
                    </div>
                  );
                })}
                {question.selectedOptionId == null && (
                  <p className="text-xs font-medium text-secondary">
                    Not answered — 0 marks.
                  </p>
                )}
              </div>

              {question.explanation && (
                <p className="mt-3 rounded-lg bg-secondary-container/30 p-3 text-xs leading-relaxed text-on-secondary-container">
                  <span className="font-bold">Explanation:</span>{" "}
                  {question.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}