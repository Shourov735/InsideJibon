"use client";

import Link from "next/link";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { DeadlineBadge } from "@/components/assignments/deadline-badge";
import type { StudentAssignmentSummary } from "@/services/assignments";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

import { ArrowRightIcon, TrophyIcon } from "@/components/shared/ui/icons";

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
    <Link
      href={targetHref}
      className={cn(
        "group flex h-full flex-col justify-between gap-3 rounded-3xl border border-outline-variant bg-surface-0 p-4 transition-all hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)] sm:p-5",
        isGraded && "bg-gradient-to-br from-emerald-50/60 via-surface-0 to-surface-0",
      )}
    >
      <div className="space-y-3">
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

        <div>
          <h3 className="line-clamp-1 font-display text-base font-semibold tracking-tight text-ink-900 group-hover:text-primary">
            {assignment.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-500">
            {assignment.instructions}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1 text-xs">
          {isGraded ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
              <TrophyIcon size={12} />
              <span>
                {t("student.assignments.card.pointsEarned", {
                  points: submission?.points ?? 0,
                  max: assignment.maxPoints,
                })}
              </span>
            </span>
          ) : (
            <span className="font-medium text-ink-500">
              {t("student.assignments.card.maxPoints", { points: assignment.maxPoints })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-outline-variant pt-3">
        <span className="text-[11px] font-semibold text-ink-500">
          {assignment.status === "closed"
            ? t("student.assignments.closedShort")
            : t("student.assignments.dueShort")}
        </span>
        <span
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold",
            isGraded
              ? "border border-outline-variant bg-surface-0 text-ink-900 group-hover:bg-surface-1"
              : "bg-primary text-on-primary group-hover:bg-primary/90",
          )}
        >
          {ctaLabel}
          <ArrowRightIcon size={12} />
        </span>
      </div>
    </Link>
  );
}
