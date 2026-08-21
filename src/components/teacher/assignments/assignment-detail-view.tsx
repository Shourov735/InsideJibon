"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  unpublishAssignmentAction,
  closeAssignmentAction,
  reopenAssignmentAction,
  deleteAssignmentAction,
} from "@/app/teacher/assignments/actions";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { DeadlineBadge } from "@/components/assignments/deadline-badge";
import { getAllowedTypesSummary, formatBytes } from "@/components/assignments/file-type-helper";
import { AssignmentPublishModal } from "./assignment-publish-modal";
import { SubmissionGradingDrawer } from "./submission-grading-drawer";
import type { Assignment } from "@/db/schema";
import type {
  TeacherSubmissionSummary,
  SubmissionStatistics,
  SubmissionDetail,
} from "@/services/assignments";
import { useTranslations } from "@/i18n/client";

interface AssignmentDetailViewProps {
  assignment: Assignment;
  courseTitle: string;
  validation: {
    canPublish: boolean;
    errors: string[];
  };
  submissions: TeacherSubmissionSummary[];
  stats: SubmissionStatistics;
  detailedSubmissionsMap?: Record<string, SubmissionDetail>;
}

export function AssignmentDetailView({
  assignment,
  courseTitle,
  validation,
  submissions,
  stats,
  detailedSubmissionsMap = {},
}: AssignmentDetailViewProps) {
  const router = useRouter();
  const { t, locale } = useTranslations();

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<SubmissionDetail | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Submissions search & tab filter
  const [submissionTab, setSubmissionTab] = useState<"all" | "submitted" | "graded" | "late">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (submissionTab === "submitted" && sub.status !== "submitted" && sub.status !== "graded") {
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

  const formattedCreated = new Intl.DateTimeFormat(
    locale === "bn" ? "bn-BD" : "en-US",
    { dateStyle: "medium" }
  ).format(new Date(assignment.createdAt));

  const formattedPublished = assignment.publishedAt
    ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", { dateStyle: "medium" }).format(
        new Date(assignment.publishedAt)
      )
    : null;

  const handleUnpublish = async () => {
    if (!window.confirm(t("teacher.assignmentDetail.unpublishConfirm"))) return;
    setIsPerformingAction(true);
    setActionError(null);
    try {
      const res = await unpublishAssignmentAction({ assignmentId: assignment.id });
      if (!res.success) {
        setActionError(res.error);
        return;
      }
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("teacher.assignmentDetail.failedAction"));
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm(t("teacher.assignmentDetail.closeConfirm"))) return;
    setIsPerformingAction(true);
    setActionError(null);
    try {
      const res = await closeAssignmentAction({ assignmentId: assignment.id });
      if (!res.success) {
        setActionError(res.error);
        return;
      }
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("teacher.assignmentDetail.failedAction"));
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleReopen = async () => {
    if (!window.confirm(t("teacher.assignmentDetail.reopenConfirm"))) return;
    setIsPerformingAction(true);
    setActionError(null);
    try {
      const res = await reopenAssignmentAction({ assignmentId: assignment.id });
      if (!res.success) {
        setActionError(res.error);
        return;
      }
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("teacher.assignmentDetail.failedAction"));
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("teacher.assignmentDetail.deleteConfirm", { title: assignment.title }))) return;
    setIsPerformingAction(true);
    setActionError(null);
    try {
      const res = await deleteAssignmentAction({ assignmentId: assignment.id }, assignment.courseId);
      if (!res.success) {
        setActionError(res.error);
        return;
      }
      router.push(`/teacher/courses/${assignment.courseId}/assignments`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("teacher.assignmentDetail.failedAction"));
    } finally {
      setIsPerformingAction(false);
    }
  };

  const openGradingForSubmission = (sub: TeacherSubmissionSummary) => {
    const detail = detailedSubmissionsMap[sub.id] ?? {
      ...sub,
      assignment,
      files: [],
    };
    setActiveSubmission(detail);
  };

  return (
    <div className="space-y-8">
      {/* Header Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-secondary">
            <Link
              href="/teacher/assignments"
              className="hover:text-primary transition-colors"
            >
              {t("teacher.assignments.title")}
            </Link>
            <span className="text-outline">/</span>
            <Link
              href={`/teacher/courses/${assignment.courseId}`}
              className="hover:text-primary transition-colors truncate max-w-xs"
            >
              {courseTitle}
            </Link>
            <span className="text-outline">/</span>
            <span className="text-on-surface truncate max-w-xs">{assignment.title}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              {assignment.title}
            </h1>
            <AssignmentStatusBadge status={assignment.status} />
            <DeadlineBadge
              dueAt={assignment.dueAt}
              isClosed={assignment.status === "closed"}
            />
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {assignment.status === "draft" && (
            <>
              <Link
                href={`/teacher/assignments/${assignment.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
              >
                <svg className="h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>{t("teacher.assignmentDetail.editSettings")}</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsPublishModalOpen(true)}
                disabled={isPerformingAction}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-container transition-colors disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{t("teacher.assignmentDetail.publish")}</span>
              </button>
            </>
          )}

          {assignment.status === "published" && (
            <>
              <button
                type="button"
                onClick={handleUnpublish}
                disabled={isPerformingAction}
                className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50"
              >
                {t("teacher.assignmentDetail.unpublish")}
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={isPerformingAction}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {t("teacher.assignmentDetail.close")}
              </button>
            </>
          )}

          {assignment.status === "closed" && (
            <button
              type="button"
              onClick={handleReopen}
              disabled={isPerformingAction}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {t("teacher.assignmentDetail.reopen")}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-container/40 p-4 text-xs font-medium text-on-error-container"
        >
          <svg className="h-4 w-4 text-error shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">{actionError}</div>
        </div>
      )}

      {/* Lifecycle Info Banners */}
      {assignment.status === "draft" && (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-secondary shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              {t("teacher.assignmentDetail.draftBanner")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary shadow-2xs hover:bg-primary-container shrink-0"
          >
            {t("teacher.assignmentDetail.publish")}
          </button>
        </div>
      )}

      {assignment.status === "published" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xs text-emerald-900 leading-relaxed">
            {t("teacher.assignmentDetail.liveBanner")}
          </p>
        </div>
      )}

      {assignment.status === "closed" && (
        <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-700 shrink-0">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-xs text-slate-800 leading-relaxed">
            {t("teacher.assignmentDetail.closedBanner")}
          </p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("teacher.assignmentDetail.stats.enrolled")}
          </span>
          <p className="mt-1 text-2xl font-bold text-primary">{stats.totalEnrolled}</p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("teacher.assignmentDetail.stats.submitted")}
          </span>
          <p className="mt-1 text-2xl font-bold text-primary">{stats.submittedCount}</p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("teacher.assignmentDetail.stats.graded")}
          </span>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.gradedCount}</p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("teacher.assignmentDetail.stats.late")}
          </span>
          <p className="mt-1 text-2xl font-bold text-amber-700">{stats.lateCount}</p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("teacher.assignmentDetail.stats.average")}
          </span>
          <p className="mt-1 text-2xl font-bold text-primary">
            {stats.averageScore !== null ? `${stats.averageScore} / ${assignment.maxPoints}` : "—"}
          </p>
        </div>
      </div>

      {/* Overview & Instructions Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Instructions */}
        <div className="lg:col-span-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-outline-variant pb-3">
            {t("teacher.assignmentDetail.instructionsTitle")}
          </h2>
          <div className="text-xs text-on-surface leading-relaxed whitespace-pre-line">
            {assignment.instructions}
          </div>
          <div className="pt-3 text-[11px] text-outline border-t border-outline-variant">
            {t("teacher.assignmentDetail.createdOn", { date: formattedCreated })}
            {formattedPublished && (
              <span> • {t("teacher.assignmentDetail.publishedOn", { date: formattedPublished })}</span>
            )}
          </div>
        </div>

        {/* Configuration & Constraints Card */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-outline-variant pb-3">
            {t("teacher.assignmentDetail.configTitle")}
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-secondary block font-medium">
                {t("teacher.assignmentDetail.dueAt")}
              </span>
              <span className="font-semibold text-on-surface">
                {assignment.dueAt
                  ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(assignment.dueAt))
                  : t("deadline.noDeadline")}
              </span>
            </div>

            <div>
              <span className="text-secondary block font-medium">
                {t("teacher.assignmentDetail.stats.maxPoints")}
              </span>
              <span className="font-semibold text-primary">
                {assignment.maxPoints} pts
              </span>
            </div>

            <div>
              <span className="text-secondary block font-medium">
                {t("teacher.assignmentDetail.latePolicy")}
              </span>
              <span className="font-semibold text-on-surface">
                {assignment.allowLateSubmission
                  ? t("teacher.assignmentDetail.lateAllowed")
                  : t("teacher.assignmentDetail.lateNotAllowed")}
              </span>
            </div>

            <div>
              <span className="text-secondary block font-medium">
                {t("teacher.assignmentDetail.maxFileSize")}
              </span>
              <span className="font-semibold text-on-surface">
                {formatBytes(assignment.maxFileSize)}
              </span>
            </div>

            <div>
              <span className="text-secondary block font-medium">
                {t("teacher.assignmentDetail.allowedTypes")}
              </span>
              <span className="font-medium text-on-surface leading-snug">
                {getAllowedTypesSummary(assignment.allowedFileTypes, locale)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions Management Section */}
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

          {/* Submissions Filter & Search */}
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

        {/* Submissions List / Table */}
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
                    <th className="px-5 py-3.5 font-semibold">{t("teacher.assignmentDetail.thStudent")}</th>
                    <th className="px-5 py-3.5 font-semibold">{t("teacher.assignmentDetail.thStatus")}</th>
                    <th className="px-5 py-3.5 font-semibold">{t("teacher.assignmentDetail.thSubmittedAt")}</th>
                    <th className="px-5 py-3.5 font-semibold">{t("teacher.assignmentDetail.thFiles")}</th>
                    <th className="px-5 py-3.5 font-semibold">{t("teacher.assignmentDetail.thGrade")}</th>
                    <th className="px-5 py-3.5 text-right font-semibold">{t("teacher.assignmentDetail.thActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-surface-container-low/70 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-semibold text-on-surface block">
                          {sub.studentName || "—"}
                        </span>
                        <span className="text-xs text-secondary font-mono">{sub.studentEmail}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <AssignmentStatusBadge status={sub.status} isLate={sub.isLate} size="sm" />
                          {sub.isLate && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                              {t("teacher.assignmentDetail.lateBadge")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-on-surface-variant">
                        {sub.submittedAt
                          ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }).format(new Date(sub.submittedAt))
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-xs text-on-surface-variant font-medium">
                        {sub.fileCount > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <svg className="h-3.5 w-3.5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
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
      </div>

      {/* Danger Zone */}
      {assignment.status !== "published" && (
        <div className="rounded-2xl border border-error/30 bg-surface-container-lowest p-6 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-error">
            {t("teacher.assignmentDetail.dangerTitle")}
          </h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-secondary max-w-xl">
              {t("teacher.assignmentDetail.deleteConfirm", { title: assignment.title })}
            </p>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPerformingAction}
              className="inline-flex items-center justify-center rounded-xl bg-error px-4 py-2 text-xs font-bold text-on-error shadow-xs hover:bg-error/90 transition-colors disabled:opacity-50 shrink-0"
            >
              {t("teacher.assignmentDetail.delete")}
            </button>
          </div>
        </div>
      )}

      {/* Modals / Drawers */}
      <AssignmentPublishModal
        assignment={assignment}
        validation={validation}
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
      />

      {activeSubmission && (
        <SubmissionGradingDrawer
          submission={activeSubmission}
          isOpen={Boolean(activeSubmission)}
          onClose={() => setActiveSubmission(null)}
          onGraded={() => {
            setActiveSubmission(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
