"use client";

import Link from "next/link";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { DeadlineBadge } from "@/components/assignments/deadline-badge";
import type { StudentAssignmentSummary } from "@/services/assignments";
import { useTranslations } from "@/i18n/client";

interface StudentAssignmentCardProps {
  assignment: StudentAssignmentSummary;
  courseId: string;
}

export function StudentAssignmentCard({
  assignment: summary,
  courseId,
}: StudentAssignmentCardProps) {
  const { t } = useTranslations();
  const { assignment, submission } = summary;

  const status = submission ? submission.status : "not_submitted";
  const isLate = Boolean(submission?.isLate);
  const isGraded = status === "graded" && submission?.points !== null && submission?.points !== undefined;

  const targetHref = `/student/courses/${courseId}/assignments/${assignment.id}`;

  const ctaLabel = (() => {
    if (isGraded) {
      return t("student.assignments.viewResult");
    }
    if (status === "draft") {
      return t("student.assignments.continueWork");
    }
    if (status === "submitted") {
      return t("student.assignments.openWorkspace");
    }
    return t("student.assignments.openWorkspace");
  })();

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs">
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-start justify-between gap-2">
          <AssignmentStatusBadge
            status={status}
            isLate={isLate}
            size="sm"
          />
          <DeadlineBadge
            dueAt={assignment.dueAt}
            isClosed={assignment.status === "closed"}
            size="sm"
          />
        </div>

        {/* Title */}
        <div>
          <h3 className="text-base font-bold tracking-tight text-on-surface line-clamp-1">
            <Link href={targetHref} className="hover:text-primary transition-colors">
              {assignment.title}
            </Link>
          </h3>
        </div>

        {/* Instructions preview */}
        <p className="line-clamp-2 text-xs text-on-surface-variant leading-relaxed">
          {assignment.instructions}
        </p>

        {/* Score / Points preview */}
        <div className="flex items-center gap-3 pt-1 text-xs">
          {isGraded ? (
            <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {t("student.assignments.card.pointsEarned", {
                  points: submission?.points ?? 0,
                  max: assignment.maxPoints,
                })}
              </span>
            </span>
          ) : (
            <span className="text-secondary font-medium">
              {t("student.assignments.card.maxPoints", { points: assignment.maxPoints })}
            </span>
          )}
        </div>
      </div>

      {/* Card CTA Footer */}
      <div className="mt-4 flex items-center justify-end border-t border-outline-variant pt-3">
        <Link
          href={targetHref}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
            isGraded
              ? "border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container"
              : "bg-primary text-on-primary shadow-2xs hover:bg-primary-container"
          }`}
        >
          <span>{ctaLabel}</span>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
