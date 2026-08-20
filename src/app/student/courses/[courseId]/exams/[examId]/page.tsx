import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireStudent } from "@/lib/permissions";
import { getAttemptForTaking, getStudentExamDetail } from "@/services/exams";
import { ExamStartButton } from "@/components/student/exams/exam-start-button";
import { ExamTaker } from "@/components/student/exams/exam-taker";

interface ExamPageProps {
  params: Promise<{ courseId: string; examId: string }>;
  searchParams: Promise<{ take?: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: ExamPageProps): Promise<Metadata> {
  const { examId } = await params;
  if (!UUID_RE.test(examId)) return { title: "Exam Not Found" };
  const user = await requireStudent();
  const detail = await getStudentExamDetail(user.id, examId);
  return { title: detail ? `${detail.title} — Exam` : "Exam Not Found" };
}

export default async function ExamPage({ params, searchParams }: ExamPageProps) {
  const { courseId, examId } = await params;
  const { take } = await searchParams;
  const user = await requireStudent();

  // Taking mode: an in-progress attempt was just started or resumed.
  if (take && UUID_RE.test(take)) {
    const taking = await getAttemptForTaking(user.id, take);
    if (!taking) notFound();
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
        </nav>
        <div className="mt-4">
          <div className="mb-6 flex items-center justify-between rounded-xl border border-primary/30 bg-secondary-container/30 p-4">
            <div>
              <h1 className="text-lg font-bold text-on-surface">
                Attempt {taking.attemptNumber}
              </h1>
              <p className="mt-0.5 text-xs text-secondary">
                Started {new Date(taking.startedAt).toLocaleString()}
                {taking.durationMinutes != null &&
                  ` · ${taking.durationMinutes} min duration`}
              </p>
            </div>
            <Link
              href={`/student/courses/${courseId}/exams/${examId}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Exit
            </Link>
          </div>
          <ExamTaker
            courseId={courseId}
            examId={examId}
            attemptId={taking.attemptId}
            questions={taking.questions}
          />
        </div>
      </main>
    );
  }

  const detail = await getStudentExamDetail(user.id, examId);
  if (!detail) notFound();

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
      </nav>

      <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8">
        <h1 className="text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
          {detail.title}
        </h1>
        {detail.description && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-on-surface-variant">
            {detail.description}
          </p>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-surface-container-low p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-secondary">
              Questions
            </dt>
            <dd className="mt-1 text-lg font-bold text-on-surface">
              {detail.questionCount}
            </dd>
          </div>
          <div className="rounded-lg bg-surface-container-low p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-secondary">
              Total marks
            </dt>
            <dd className="mt-1 text-lg font-bold text-on-surface">
              {detail.totalMarks}
            </dd>
          </div>
          <div className="rounded-lg bg-surface-container-low p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-secondary">
              Duration
            </dt>
            <dd className="mt-1 text-lg font-bold text-on-surface">
              {detail.durationMinutes != null
                ? `${detail.durationMinutes} min`
                : "—"}
            </dd>
          </div>
          <div className="rounded-lg bg-surface-container-low p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-secondary">
              Attempts
            </dt>
            <dd className="mt-1 text-lg font-bold text-on-surface">
              {detail.maxAttempts != null
                ? `${detail.attemptsUsed}/${detail.maxAttempts}`
                : detail.attemptsUsed}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          {detail.inProgressAttemptId ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`?take=${detail.inProgressAttemptId}`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
              >
                Resume Attempt
              </Link>
              <ExamStartButton examId={detail.id} label="Start New Attempt" />
            </div>
          ) : detail.attemptsUsed >= (detail.maxAttempts ?? Infinity) ? (
            <p className="text-sm font-medium text-secondary">
              You have used all your attempts for this exam.
            </p>
          ) : (
            <ExamStartButton examId={detail.id} label="Start Exam" />
          )}
        </div>
      </div>

      {detail.attempts.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-on-surface">Previous attempts</h2>
          <div className="mt-3 space-y-2">
            {detail.attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
              >
                <div>
                  <p className="text-sm font-medium text-on-surface">
                    Attempt {attempt.attemptNumber}
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {new Date(attempt.startedAt).toLocaleString()}
                  </p>
                </div>
                {attempt.status === "submitted" ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-primary">
                      {attempt.score}/{attempt.totalPoints} · {attempt.percentage}%
                    </span>
                    <Link
                      href={`/student/courses/${courseId}/exams/${examId}/result?attempt=${attempt.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View result
                    </Link>
                  </div>
                ) : (
                  <Link
                    href={`?take=${attempt.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Resume
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}