"use client";

import { useMemo, useState } from "react";

import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { useTranslations } from "@/i18n/client";
import type { Assignment } from "@/db/schema";
import type {
  TeacherSubmissionSummary,
  SubmissionStatistics,
  SubmissionDetail,
} from "@/services/assignments";

import { SubmissionGradingDrawer } from "./submission-grading-drawer";

interface AssignmentSubmissionsTableProps {
  assignment: Assignment;
  submissions: TeacherSubmissionSummary[];
  stats: SubmissionStatistics;
  detailedSubmissionsMap?: Record<string, SubmissionDetail>;
  onGraded: () => void;
}

type SubmissionTab = "all" | "submitted" | "graded" | "late";

/**
 * R0 §4.3: submissions table + tab filter + search + grading drawer trigger.
 * Lifts its own filter/search state and owns the SubmissionGradingDrawer
 * open/close lifecycle. Calls `onGraded` after a successful grade so the
 * parent can refresh.
 */
export function AssignmentSubmissionsTable({
  assignment,
  submissions,
  stats,
  detailedSubmissionsMap = {},
  onGraded,
}: AssignmentSubmissionsTableProps) {
  const { t, locale } = useTranslations();

  const [submissionTab, setSubmissionTab] = useState<SubmissionTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubmission, setActiveSubmission] = useState<SubmissionDetail | null>(null);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (
        submissionTab === "submitted" &&
        sub.status !== "submitted" &&
        sub.status !== "graded"
      ) {
        return false;
      }
      if (submissionTab === "graded" && sub.status !== "graded") {
        return false;
      }
      if (submissionTab === "late" && !sub.isLate) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = sub.studentName?.toLowerCase().includes(q) ?? false;
        const emailMatch = sub.studentEmail.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [submissions, submissionTab, searchQuery]);

  function openGradingForSubmission(sub: TeacherSubmissionSummary) {
    const detail = detailedSubmissionsMap[sub.id] ?? {
      ...sub,
      assignment,
      files: [],
    };
    setActiveSubmission(detail);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-on-surface">
            {t("teacher.assignmentDetail.submissionsTitle")}
          </h2>
          <p className="text-xs text-secondary mt-0.5">
            {t("teacher.assignmentDetail.submissionsSubtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-outline-variant bg-surface-container-low p-0.5">
            <button
              type="button"
              onClick={() => setSubmissionTab("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                submissionTab === "all"
                  ? "bg-surface-container-lowest text-primary shadow-2xs"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              {t("teacher.assignments.tabs.all")} ({submissions.length})
            </button>
            <button
              type="button"
              onClick={() => setSubmissionTab("submitted")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                submissionTab === "submitted"
                  ? "bg-surface-container-lowest text-primary shadow-2xs"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              {t("teacher.assignmentDetail.submittedBadge")} ({stats.submittedCount})
            </button>
            <button
              type="button"
              onClick={() => setSubmissionTab("graded")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                submissionTab === "graded"
                  ? "bg-surface-container-lowest text-primary shadow-2xs"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              {t("teacher.assignmentDetail.gradedBadge")} ({stats.gradedCount})
            </button>
            <button
              type="button"
              onClick={() => setSubmissionTab("late")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                submissionTab === "late"
                  ? "bg-surface-container-lowest text-primary shadow-2xs"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              {t("teacher.assignmentDetail.lateBadge")} ({stats.lateCount})
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student…"
            className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1 text-xs text-on-surface outline-none focus:border-primary"
          />
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center shadow-xs space-y-2">
          <h3 className="text-sm font-bold text-on-surface">
            {t("teacher.assignmentDetail.noSubmissions")}
          </h3>
          <p className="mx-auto max-w-sm text-xs text-secondary">
            {t("teacher.assignmentDetail.noSubmissionsDesc")}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-wider text-secondary">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">
                    {t("teacher.assignmentDetail.thStudent")}
                  </th>
                  <th className="px-5 py-3.5 font-semibold">
                    {t("teacher.assignmentDetail.thStatus")}
                  </th>
                  <th className="px-5 py-3.5 font-semibold">
                    {t("teacher.assignmentDetail.thSubmittedAt")}
                  </th>
                  <th className="px-5 py-3.5 font-semibold">
                    {t("teacher.assignmentDetail.thFiles")}
                  </th>
                  <th className="px-5 py-3.5 font-semibold">
                    {t("teacher.assignmentDetail.thGrade")}
                  </th>
                  <th className="px-5 py-3.5 text-right font-semibold">
                    {t("teacher.assignmentDetail.thActions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredSubmissions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-surface-container-low/70 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <span className="font-semibold text-on-surface block">
                        {sub.studentName || "—"}
                      </span>
                      <span className="text-xs text-secondary font-mono">
                        {sub.studentEmail}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <AssignmentStatusBadge
                          status={sub.status}
                          isLate={sub.isLate}
                          size="sm"
                        />
                        {sub.isLate ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                            {t("teacher.assignmentDetail.lateBadge")}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-on-surface-variant">
                      {sub.submittedAt
                        ? new Intl.DateTimeFormat(
                            locale === "bn" ? "bn-BD" : "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          ).format(new Date(sub.submittedAt))
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-on-surface-variant font-medium">
                      {sub.fileCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <svg
        className="h-3.5 w-3.5 text-secondary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                          </svg>
                          {sub.fileCount}
                        </span>
                      ) : (
                        <span className="text-outline">0</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-bold">
                      {sub.status === "graded" && sub.points !== null ? (
                        <span className="text-emerald-700">
                          {sub.points} / {assignment.maxPoints}
                        </span>
                      ) : (
                        <span className="text-outline">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {sub.status === "submitted" || sub.status === "graded" ? (
                        <button
                          type="button"
                          onClick={() => openGradingForSubmission(sub)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                            sub.status === "graded"
                              ? "border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container"
                              : "bg-primary text-on-primary shadow-2xs hover:bg-primary-container"
                          }`}
                        >
                          {sub.status === "graded"
                            ? t("teacher.assignmentDetail.regradeBtn")
                            : t("teacher.assignmentDetail.gradeBtn")}
                        </button>
                      ) : (
                        <span className="text-xs text-outline italic">
                          {t("teacher.assignmentDetail.unsubmittedBadge")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubmission ? (
        <SubmissionGradingDrawer
          submission={activeSubmission}
          isOpen={Boolean(activeSubmission)}
          onClose={() => setActiveSubmission(null)}
          onGraded={() => {
            setActiveSubmission(null);
            onGraded();
          }}
        />
      ) : null}
    </div>
  );
}
