import Link from "next/link";
import type { ExamWithQuestionCount } from "@/types/exam";
import { StatusBadge } from "../status-badge";

interface ExamCardProps {
  exam: ExamWithQuestionCount;
  courseTitle?: string;
}

export function ExamCard({ exam, courseTitle }: ExamCardProps) {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(exam.updatedAt));

  return (
    <div className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-md">
      <div>
        {/* Top meta & status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {courseTitle ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary truncate max-w-full">
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-primary/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <span className="truncate">{courseTitle}</span>
              </span>
            ) : (
              <span className="font-mono text-xs text-secondary">Course Exam</span>
            )}
            <h3 className="mt-1 line-clamp-1 text-lg font-bold tracking-tight text-on-surface">
              <Link
                href={`/teacher/exams/${exam.id}`}
                className="hover:text-primary transition-colors"
              >
                {exam.title}
              </Link>
            </h3>
          </div>
          <StatusBadge status={exam.status} />
        </div>

        {/* Description */}
        <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">
          {exam.description || "No description provided for this exam."}
        </p>

        {/* Metrics Row */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-secondary">
          <div className="flex items-center gap-1.5 rounded-md bg-surface-container-low px-2 py-1">
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <span>
              {exam.questionCount} {exam.questionCount === 1 ? "Question" : "Questions"}
            </span>
          </div>

          {exam.durationMinutes ? (
            <div className="flex items-center gap-1.5 rounded-md bg-surface-container-low px-2 py-1">
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
              <span>{exam.durationMinutes} mins</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-md bg-surface-container-low px-2 py-1 text-outline">
              <svg
                className="h-3.5 w-3.5"
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
              <span>Untimed</span>
            </div>
          )}

          <span className="ml-auto text-[11px] text-outline">
            Updated {formattedDate}
          </span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-outline-variant pt-4">
        <Link
          href={`/teacher/exams/${exam.id}/builder`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary shadow-2xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <span>{exam.status === "draft" ? "Question Builder" : "View Paper"}</span>
        </Link>

        <Link
          href={`/teacher/exams/${exam.id}`}
          className="inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container hover:text-primary"
        >
          Overview
        </Link>

        <Link
          href={`/teacher/exams/${exam.id}/edit`}
          className="inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low p-2 text-secondary transition-colors hover:bg-surface-container hover:text-primary"
          title="Edit Exam Settings"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
