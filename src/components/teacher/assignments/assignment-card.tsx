"use client";

import Link from "next/link";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { DeadlineBadge } from "@/components/assignments/deadline-badge";
import type { AssignmentWithCounts } from "@/services/assignments";
import { useTranslations } from "@/i18n/client";

interface AssignmentCardProps {
  assignment: AssignmentWithCounts;
  courseTitle?: string;
}

export function AssignmentCard({ assignment, courseTitle }: AssignmentCardProps) {
  const { t, tn, locale } = useTranslations();

  const formattedDate = new Intl.DateTimeFormat(
    locale === "bn" ? "bn-BD" : "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  ).format(new Date(assignment.updatedAt));

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs">
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-start justify-between gap-2">
          <AssignmentStatusBadge
            status={assignment.status}
            size="sm"
          />
          <DeadlineBadge
            dueAt={assignment.dueAt}
            isClosed={assignment.status === "closed"}
            size="sm"
          />
        </div>

        {/* Title and Course */}
        <div>
          <h3 className="text-base font-bold tracking-tight text-on-surface line-clamp-1">
            <Link
              href={`/teacher/assignments/${assignment.id}`}
              className="hover:text-primary transition-colors"
            >
              {assignment.title}
            </Link>
          </h3>
          {courseTitle && (
            <p className="mt-0.5 text-xs font-medium text-secondary truncate">
              {courseTitle}
            </p>
          )}
        </div>

        {/* Instructions preview */}
        <p className="line-clamp-2 text-xs text-on-surface-variant leading-relaxed">
          {assignment.instructions}
        </p>

        {/* Metadata info: Points, Submissions */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-medium text-secondary">
          <span className="flex items-center gap-1 rounded bg-surface-container-low px-2 py-1 text-primary font-semibold">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span>{t("teacher.assignments.pointsCount", { points: assignment.maxPoints })}</span>
          </span>

          <span className="flex items-center gap-1 text-on-surface-variant">
            <svg className="h-3.5 w-3.5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>
              {t("teacher.assignments.submissionRatio", {
                submitted: assignment.submissionCount,
                graded: assignment.gradedCount,
              })}
            </span>
          </span>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-3">
        <span className="text-[11px] text-outline">
          {t("common.updatedOn", { date: formattedDate })}
        </span>

        <div className="flex items-center gap-2">
          {assignment.status === "draft" && (
            <Link
              href={`/teacher/assignments/${assignment.id}/edit`}
              className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            >
              {t("teacher.assignments.editAssignment")}
            </Link>
          )}

          <Link
            href={`/teacher/assignments/${assignment.id}`}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary shadow-2xs hover:bg-primary-container hover:text-on-primary-container transition-colors"
          >
            {assignment.submissionCount > 0
              ? t("teacher.assignments.viewSubmissions")
              : t("teacher.assignments.details")}
          </Link>
        </div>
      </div>
    </div>
  );
}
