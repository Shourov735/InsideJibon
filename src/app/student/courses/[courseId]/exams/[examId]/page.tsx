import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireStudent } from "@/lib/permissions";
import { getAttemptForTaking, getStudentExamDetail } from "@/services/exams";
import { getLearningCourse } from "@/services/learning";
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
  return { title: detail ? `${detail.title} — Assessment` : "Exam Not Found" };
}

export default async function ExamPage({ params, searchParams }: ExamPageProps) {
  const { courseId, examId } = await params;
  const { take } = await searchParams;
  const user = await requireStudent();

  const course = await getLearningCourse(user.id, courseId);
  if (!course) notFound();

  // TAKING MODE: An in-progress attempt was just started or resumed via ?take=<attemptId>
  if (take && UUID_RE.test(take)) {
    const taking = await getAttemptForTaking(user.id, take);
    if (!taking) notFound();

    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-4">
        {/* Navigation / Exit bar */}
        <nav className="flex items-center justify-between text-xs font-medium text-secondary">
          <div className="flex items-center gap-2">
            <Link href="/student" className="hover:text-primary transition-colors">
              Dashboard
            </Link>
            <svg className="h-3 w-3 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <Link href={`/student/courses/${courseId}/exams`} className="hover:text-primary transition-colors">
              Exams
            </Link>
            <svg className="h-3 w-3 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-on-surface font-semibold truncate max-w-xs">
              Attempt {taking.attemptNumber}
            </span>
          </div>

          <Link
            href={`/student/courses/${courseId}/exams/${examId}`}
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-error transition-colors"
          >
            <span>Exit Exam</span>
          </Link>
        </nav>

        {/* Exam Taker Interface */}
        <ExamTaker
          courseId={courseId}
          examId={examId}
          attemptId={taking.attemptId}
          questions={taking.questions}
          durationMinutes={taking.durationMinutes}
          startedAt={taking.startedAt}
        />
      </main>
    );
  }

  // INTRO / DETAILS MODE
  const detail = await getStudentExamDetail(user.id, examId);
  if (!detail) notFound();

  const attemptsLeft =
    detail.maxAttempts != null
      ? Math.max(0, detail.maxAttempts - detail.attemptsUsed)
      : null;
  const canStartNew =
    detail.maxAttempts == null || detail.attemptsUsed < detail.maxAttempts;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-secondary">
        <Link href="/student" className="hover:text-primary transition-colors">
          Dashboard
        </Link>
        <svg className="h-3 w-3 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <Link href="/student/courses" className="hover:text-primary transition-colors">
          My Courses
        </Link>
        <svg className="h-3 w-3 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/student/courses/${courseId}/exams`} className="hover:text-primary transition-colors">
          Exams
        </Link>
        <svg className="h-3 w-3 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-on-surface font-semibold truncate max-w-xs">{detail.title}</span>
      </nav>

      {/* Main Examination Overview Card */}
      <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-10 shadow-xs space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              পরীক্ষা বিবরণী • Exam Instructions
            </span>
            <span className="text-xs text-secondary">• {course.title}</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {detail.title}
          </h1>

          {detail.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface-variant pt-1">
              {detail.description}
            </p>
          )}
        </div>

        {/* Parameters Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-center sm:text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
              Questions
            </span>
            <p className="mt-1 text-2xl font-bold text-primary">{detail.questionCount}</p>
            <span className="text-[11px] text-secondary">Multiple Choice</span>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-center sm:text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
              Total Marks
            </span>
            <p className="mt-1 text-2xl font-bold text-primary">{detail.totalMarks}</p>
            <span className="text-[11px] text-secondary">Maximum score</span>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-center sm:text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
              Duration
            </span>
            <p className="mt-1 text-2xl font-bold text-primary">
              {detail.durationMinutes ? `${detail.durationMinutes}m` : "Untimed"}
            </p>
            <span className="text-[11px] text-secondary">Time allocation</span>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-center sm:text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
              Attempts
            </span>
            <p className="mt-1 text-2xl font-bold text-primary">
              {detail.maxAttempts != null
                ? `${detail.attemptsUsed}/${detail.maxAttempts}`
                : `${detail.attemptsUsed} used`}
            </p>
            <span className="text-[11px] text-secondary">
              {attemptsLeft != null
                ? attemptsLeft === 0
                  ? "None remaining"
                  : `${attemptsLeft} left`
                : "Unlimited"}
            </span>
          </div>
        </div>

        {/* Academic Rules & Guidelines */}
        <div className="rounded-2xl border border-outline-variant/70 bg-surface-container-low p-5 space-y-2.5 text-xs text-on-surface-variant">
          <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface flex items-center gap-2">
            <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Important Assessment Guidelines</span>
          </h3>
          <ul className="space-y-1.5 list-disc list-inside text-secondary">
            <li>Each question has exactly one correct answer among the provided choices.</li>
            <li>You can navigate between questions, change answers, and flag questions for review before submitting.</li>
            <li>Unanswered questions score 0 marks. Submission is final and immediately graded.</li>
            {detail.durationMinutes && (
              <li>Keep track of the countdown timer at the top of your screen during the examination.</li>
            )}
          </ul>
        </div>

        {/* Primary Action Buttons */}
        <div className="border-t border-outline-variant pt-6">
          {detail.inProgressAttemptId ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={`?take=${detail.inProgressAttemptId}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-amber-700"
              >
                <span>Resume In-Progress Attempt</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              {canStartNew && (
                <ExamStartButton
                  examId={detail.id}
                  label="Start Fresh Attempt"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-5 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors"
                />
              )}
            </div>
          ) : !canStartNew ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-center justify-between">
              <div>
                <p className="font-bold">Attempt Limit Reached</p>
                <p className="mt-0.5">You have used all {detail.maxAttempts} allowed attempts for this examination.</p>
              </div>
              {detail.attempts.length > 0 && (
                <Link
                  href={`/student/courses/${courseId}/exams/${detail.id}/result`}
                  className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-container"
                >
                  View Latest Result
                </Link>
              )}
            </div>
          ) : (
            <ExamStartButton
              examId={detail.id}
              label={detail.attemptsUsed > 0 ? "Start Next Attempt" : "Start Examination Now"}
            />
          )}
        </div>
      </div>

      {/* Previous Attempts History */}
      {detail.attempts.length > 0 && (
        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant pb-4">
            <div>
              <h2 className="text-base font-bold text-on-surface">Previous Attempt History</h2>
              <p className="text-xs text-secondary mt-0.5">Your recorded examination submissions and scores</p>
            </div>
            <span className="text-xs font-semibold text-secondary">
              {detail.attempts.length} {detail.attempts.length === 1 ? "Record" : "Records"}
            </span>
          </div>

          <div className="space-y-3">
            {detail.attempts.map((attempt) => {
              const isSubmitted = attempt.status === "submitted";
              const formattedStarted = new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(attempt.startedAt));

              return (
                <div
                  key={attempt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-outline-variant bg-surface-container-low/40 p-4 sm:p-5 transition-colors hover:bg-surface-container-low"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                        {attempt.attemptNumber}
                      </span>
                      <h3 className="font-bold text-sm text-on-surface">
                        Attempt {attempt.attemptNumber}
                      </h3>
                      {isSubmitted ? (
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          Submitted
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 animate-pulse">
                          In Progress
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-secondary pl-8">
                      Started: {formattedStarted}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pl-8 sm:pl-0">
                    {isSubmitted && attempt.score != null && (
                      <div className="text-right">
                        <span className="text-base font-extrabold text-primary">
                          {attempt.percentage}%
                        </span>
                        <p className="text-[11px] font-medium text-secondary">
                          {attempt.score}/{attempt.totalPoints} marks
                        </p>
                      </div>
                    )}

                    {isSubmitted ? (
                      <Link
                        href={`/student/courses/${courseId}/exams/${examId}/result?attempt=${attempt.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-surface-container-high px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-on-primary transition-colors"
                      >
                        <span>Review Result</span>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ) : (
                      <Link
                        href={`?take=${attempt.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
                      >
                        <span>Resume</span>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}