"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  uploadSubmissionFileAction,
  deleteSubmissionFileAction,
  submitAssignmentAction,
} from "@/app/student/actions/assignment-actions";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { DeadlineBadge } from "@/components/assignments/deadline-badge";
import { SubmissionFileItem } from "@/components/assignments/submission-file-item";
import {
  formatBytes,
  getAllowedTypesSummary,
  getAcceptStringFromMimeTypes,
} from "@/components/assignments/file-type-helper";
import type { Assignment, AssignmentSubmission, AssignmentSubmissionFile } from "@/db/schema";
import { useTranslations } from "@/i18n/client";

interface StudentAssignmentWorkspaceProps {
  assignment: Assignment;
  courseTitle: string;
  submission: AssignmentSubmission | null;
  files: AssignmentSubmissionFile[];
  isLateSubmission: boolean;
  canResubmit: boolean;
}

export function StudentAssignmentWorkspace({
  assignment,
  courseTitle,
  submission,
  files,
  isLateSubmission,
  canResubmit,
}: StudentAssignmentWorkspaceProps) {
  const router = useRouter();
  const { t, locale } = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const status = submission?.status ?? "not_submitted";
  const isGraded = status === "graded";
  const isSubmitted = status === "submitted";
  const isClosed = assignment.status === "closed";

  // Editable submission if not submitted or if canResubmit is true (and assignment not closed)
  const canModifyFiles = (!isSubmitted && !isGraded && !isClosed) || (canResubmit && !isClosed);

  const formattedSubmitted = submission?.submittedAt
    ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(submission.submittedAt))
    : null;

  const formattedGraded = submission?.gradedAt
    ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
        dateStyle: "medium",
      }).format(new Date(submission.gradedAt))
    : null;

  const scorePercentage =
    submission?.points !== null && submission?.points !== undefined && assignment.maxPoints > 0
      ? Math.round((submission.points / assignment.maxPoints) * 100)
      : null;

  // Handle client-side file upload
  const handleFileUpload = async (file: File) => {
    setErrorMessage(null);

    // Client-side file size check
    if (file.size > assignment.maxFileSize) {
      setErrorMessage(
        t("errors.assignmentFileTooLarge") + ` (${formatBytes(assignment.maxFileSize)})`
      );
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("assignmentId", assignment.id);
      formData.append("file", file);

      const res = await uploadSubmissionFileAction(formData);
      if (!res.success) {
        setErrorMessage(res.error);
        return;
      }

      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("errors.uploadFailed")
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      handleFileUpload(fileList[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canModifyFiles || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    setErrorMessage(null);
    try {
      const res = await deleteSubmissionFileAction({ fileId });
      if (!res.success) {
        setErrorMessage(res.error);
        return;
      }
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("teacher.assignmentDetail.failedAction")
      );
    }
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitAssignmentAction({ assignmentId: assignment.id });
      if (!res.success) {
        setErrorMessage(res.error);
        return;
      }

      setIsConfirmModalOpen(false);
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("teacher.assignmentDetail.failedAction")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const acceptString = getAcceptStringFromMimeTypes(assignment.allowedFileTypes ?? undefined);

  return (
    <div className="space-y-8">
      {/* Header Breadcrumbs & Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-secondary">
            <Link
              href={`/student/courses/${assignment.courseId}`}
              className="hover:text-primary transition-colors truncate max-w-xs"
            >
              {courseTitle}
            </Link>
            <span className="text-outline">/</span>
            <Link
              href={`/student/courses/${assignment.courseId}/assignments`}
              className="hover:text-primary transition-colors"
            >
              {t("student.assignments.breadcrumb")}
            </Link>
            <span className="text-outline">/</span>
            <span className="text-on-surface truncate max-w-xs">{assignment.title}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              {assignment.title}
            </h1>
            <AssignmentStatusBadge
              status={status}
              isLate={Boolean(submission?.isLate)}
            />
            <DeadlineBadge
              dueAt={assignment.dueAt}
              isClosed={isClosed}
            />
          </div>
        </div>

        <Link
          href={`/student/courses/${assignment.courseId}/assignments`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors shrink-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{t("teacher.assignmentDetail.backToAssignments")}</span>
        </Link>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-container/40 p-4 text-xs font-medium text-on-error-container"
        >
          <svg className="h-4 w-4 text-error shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* Graded Result Card */}
      {isGraded && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
            <div className="flex items-center gap-2 text-emerald-900">
              <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-base font-bold">
                {t("student.assignmentWorkspace.gradedTitle")}
              </h3>
            </div>
            {formattedGraded && (
              <span className="text-xs text-emerald-800 font-medium">
                {t("student.assignmentWorkspace.gradedOn", { date: formattedGraded })}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                {t("student.assignmentWorkspace.scoreAwarded")}
              </span>
              <p className="mt-1 text-2xl font-black text-emerald-900">
                {t("student.assignmentWorkspace.pointsOutOf", {
                  points: submission?.points ?? 0,
                  maxPoints: assignment.maxPoints,
                  percent: scorePercentage ?? 0,
                })}
              </p>
            </div>
          </div>

          {submission?.feedback && (
            <div className="rounded-xl border border-emerald-200 bg-surface-container-lowest p-4 space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {t("student.assignmentWorkspace.feedbackTitle")}
              </span>
              <p className="text-xs text-on-surface whitespace-pre-line leading-relaxed">
                {submission.feedback}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Submitted Awaiting Grading Banner */}
      {isSubmitted && !isGraded && formattedSubmitted && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary shrink-0">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">
                {t("student.assignmentWorkspace.submittedStateTitle")}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {t("student.assignmentWorkspace.submittedStateDesc", { date: formattedSubmitted })}
              </p>
            </div>
          </div>
          {submission?.isLate && (
            <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-300 shrink-0">
              {t("teacher.assignmentDetail.lateBadge")}
            </span>
          )}
        </div>
      )}

      {/* Closed Notice */}
      {isClosed && !isSubmitted && !isGraded && (
        <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4 text-xs font-medium text-slate-800 flex items-center gap-2.5">
          <svg className="h-4 w-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>{t("student.assignmentWorkspace.closedWarning")}</span>
        </div>
      )}

      {/* Two-Column Grid: Instructions & Requirements */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Instructions */}
        <div className="lg:col-span-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-outline-variant pb-3">
            {t("student.assignmentWorkspace.instructionsTitle")}
          </h2>
          <div className="text-xs text-on-surface leading-relaxed whitespace-pre-line">
            {assignment.instructions}
          </div>
        </div>

        {/* Right Column: Constraints & Rubric */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-outline-variant pb-3">
            {t("student.assignmentWorkspace.guidelinesTitle")}
          </h2>

          <div className="space-y-3.5 text-xs">
            <div>
              <span className="text-secondary block font-medium">
                {t("student.assignmentWorkspace.deadline")}
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
                {t("student.assignmentWorkspace.maxScore")}
              </span>
              <span className="font-semibold text-primary">
                {assignment.maxPoints} marks
              </span>
            </div>

            <div>
              <span className="text-secondary block font-medium">
                {t("student.assignmentWorkspace.latePolicy")}
              </span>
              <span className="font-medium text-on-surface">
                {assignment.allowLateSubmission
                  ? t("student.assignmentWorkspace.latePolicyAllowed")
                  : t("student.assignmentWorkspace.latePolicyNotAllowed")}
              </span>
            </div>

            <div>
              <span className="text-secondary block font-medium">
                {t("student.assignmentWorkspace.maxSize")}
              </span>
              <span className="font-semibold text-on-surface">
                {formatBytes(assignment.maxFileSize)}
              </span>
            </div>

            <div>
              <span className="text-secondary block font-medium">
                {t("student.assignmentWorkspace.allowedTypes")}
              </span>
              <span className="font-medium text-on-surface leading-snug">
                {getAllowedTypesSummary(assignment.allowedFileTypes, locale)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Workspace Area: File Upload & Files List */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-outline-variant pb-4">
          <div>
            <h2 className="text-base font-bold text-on-surface">
              {t("student.assignmentWorkspace.yourSubmission")}
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              {t("student.assignmentWorkspace.uploadSubtitle")}
            </p>
          </div>
        </div>

        {/* Upload Dropzone (active only if modifications allowed) */}
        {canModifyFiles && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-outline-variant bg-surface-container-low hover:border-primary/50 hover:bg-surface-container"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptString}
              onChange={handleFileInputChange}
              disabled={isUploading}
              className="hidden"
            />

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {isUploading ? (
                <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
            </div>

            <p className="mt-3 text-xs font-bold text-on-surface">
              {isUploading
                ? t("student.assignmentWorkspace.uploading")
                : t("student.assignmentWorkspace.dropzoneText")}
            </p>
            <p className="mt-1 text-[11px] text-secondary">
              {getAllowedTypesSummary(assignment.allowedFileTypes, locale)} (Max {formatBytes(assignment.maxFileSize)})
            </p>
          </div>
        )}

        {/* Attached Files List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
            {t("student.assignmentWorkspace.attachedFiles", { count: files.length })}
          </h3>

          {files.length === 0 ? (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-xs text-secondary italic">
              {t("student.assignmentWorkspace.noFilesAttached")}
            </div>
          ) : (
            <div className="space-y-2.5">
              {files.map((file) => (
                <SubmissionFileItem
                  key={file.id}
                  file={file}
                  canDelete={canModifyFiles}
                  onDelete={handleDeleteFile}
                />
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions Area */}
        {canModifyFiles && files.length > 0 && (
          <div className="flex items-center justify-end border-t border-outline-variant pt-4">
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={isSubmitting || isUploading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>
                {isSubmitted
                  ? t("student.assignmentWorkspace.resubmitBtn")
                  : t("student.assignmentWorkspace.submitBtn")}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Submit Confirmation Dialog */}
      {isConfirmModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 id="confirm-modal-title" className="text-base font-bold text-on-surface">
                  {t("student.assignmentWorkspace.confirmModalTitle")}
                </h3>
                <p className="mt-1 text-xs text-secondary leading-relaxed">
                  {t("student.assignmentWorkspace.confirmModalDesc")}
                </p>
              </div>
            </div>

            {isLateSubmission && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                {t("student.assignmentWorkspace.confirmModalLateNotice")}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                {t("student.assignmentWorkspace.cancelModalBtn")}
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-container disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{t("student.assignmentWorkspace.submitting")}</span>
                  </>
                ) : (
                  <span>{t("student.assignmentWorkspace.confirmSubmitBtn")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
