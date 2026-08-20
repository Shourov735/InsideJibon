import Link from "next/link";
import type { StudentCourseExam } from "@/types/exam";
import { getTranslator } from "@/i18n/server";

interface StudentExamCardProps {
  exam: StudentCourseExam;
  courseId: string;
}

export async function StudentExamCard({ exam, courseId }: StudentExamCardProps) {
  const t = await getTranslator();
  const isInProgress = Boolean(exam.inProgressAttemptId);
  const isCompleted = exam.attemptsUsed > 0;
  const attemptsLeft =
    exam.maxAttempts != null
      ? Math.max(0, exam.maxAttempts - exam.attemptsUsed)
      : null;
  const canAttempt =
    exam.maxAttempts == null || exam.attemptsUsed < exam.maxAttempts;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-md">
      <div className="space-y-3">
        {/* Status & Attempt Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isInProgress ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                {t("student.exam.inProgressBadge")}
              </span>
            ) : isCompleted ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {t("student.exam.attemptedBadge", { used: exam.attemptsUsed })}
                {exam.maxAttempts ? `/${exam.maxAttempts}` : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-semibold text-secondary">
                {t("student.exam.readyToStart")}
              </span>
            )}
          </div>

          {exam.bestPercentage != null && (
            <div className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
              <span>{t("student.exam.bestScore")}</span>
              <span className="font-extrabold">{exam.bestPercentage}%</span>
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-lg font-bold tracking-tight text-on-surface">
            <Link
              href={`/student/courses/${courseId}/exams/${exam.id}`}
              className="hover:text-primary transition-colors"
            >
              {exam.title}
            </Link>
          </h3>
          {exam.description && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-on-surface-variant">
              {exam.description}
            </p>
          )}
        </div>

        {/* Key Metrics Chips */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs font-medium text-secondary">
          <div className="flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 py-1 text-on-surface">
            <svg
              className="h-3.5 w-3.5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span>
              {t.tn("student.exam.question", exam.questionCount)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 py-1 text-on-surface">
            <svg
              className="h-3.5 w-3.5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              />
            </svg>
            <span>{t("student.exam.totalMarksLabel", { marks: exam.totalMarks })}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 py-1 text-on-surface">
            <svg
              className="h-3.5 w-3.5 text-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              {exam.durationMinutes
                ? t("student.exam.durationShort", { minutes: exam.durationMinutes })
                : t("common.status.untimed")}
            </span>
          </div>

          {exam.maxAttempts != null && (
            <div className="flex items-center gap-1 rounded-lg bg-surface-container-low px-2.5 py-1 text-secondary">
              <span>
                {attemptsLeft === 0
                  ? t("student.exam.noAttemptsLeft")
                  : t.tn("student.exam.attemptsLeft", attemptsLeft ?? 0)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
        {isInProgress ? (
          <Link
            href={`/student/courses/${courseId}/exams/${exam.id}?take=${exam.inProgressAttemptId}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-amber-700"
          >
            <span>{t("student.exam.resumeAttempt")}</span>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        ) : canAttempt ? (
          <Link
            href={`/student/courses/${courseId}/exams/${exam.id}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
          >
            <span>{isCompleted ? t("student.exam.retake") : t("student.exam.startExam")}</span>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        ) : (
          <Link
            href={`/student/courses/${courseId}/exams/${exam.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container hover:text-primary"
          >
            <span>{t("student.exam.viewResultsHistory")}</span>
          </Link>
        )}

        <Link
          href={`/student/courses/${courseId}/exams/${exam.id}`}
          className="inline-flex items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-secondary transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          {t("student.exam.details")}
        </Link>
      </div>
    </div>
  );
}
