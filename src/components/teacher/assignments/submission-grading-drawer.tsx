"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { gradeSubmissionAction } from "@/app/teacher/assignments/actions";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { SubmissionFileItem } from "@/components/assignments/submission-file-item";
import { MAX_ASSIGNMENT_FEEDBACK_LENGTH } from "@/schemas/assignment";
import type { SubmissionDetail } from "@/services/assignments";
import { useTranslations } from "@/i18n/client";

interface SubmissionGradingDrawerProps {
  submission: SubmissionDetail;
  isOpen: boolean;
  onClose: () => void;
  onGraded?: () => void;
}

export function SubmissionGradingDrawer({
  submission,
  isOpen,
  onClose,
  onGraded,
}: SubmissionGradingDrawerProps) {
  const router = useRouter();
  const { t, locale } = useTranslations();
  const pointsInputId = useId();
  const feedbackInputId = useId();

  const [points, setPoints] = useState<number | string>(
    submission.points !== null ? submission.points : ""
  );
  const [feedback, setFeedback] = useState<string>(submission.feedback ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const formattedSubmittedAt = submission.submittedAt
    ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(submission.submittedAt))
    : "—";

  const formattedGradedAt = submission.gradedAt
    ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(submission.gradedAt))
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const numericPoints = Number(points);
    if (isNaN(numericPoints) || numericPoints < 0 || numericPoints > submission.assignment.maxPoints) {
      setErrorMessage(t("errors.invalidPointsRange"));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await gradeSubmissionAction({
        submissionId: submission.id,
        points: numericPoints,
        feedback: feedback.trim() ? feedback.trim() : null,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setSuccessMessage(t("teacher.grading.success"));
      router.refresh();
      if (onGraded) onGraded();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("teacher.assignmentDetail.failedAction")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grading-drawer-title"
    >
      <div className="flex h-full w-full max-w-xl flex-col bg-surface-container-lowest shadow-2xl border-l border-outline-variant overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-outline-variant p-6">
          <div>
            <h3 id="grading-drawer-title" className="text-base font-bold text-on-surface">
              {t("teacher.grading.title")}
            </h3>
            <p className="text-xs text-secondary truncate max-w-sm mt-0.5">
              {submission.assignment.title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-error/30 bg-error-container/40 p-3.5 text-xs font-medium text-on-error-container"
            >
              <svg className="h-4 w-4 text-error shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900"
            >
              <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Student Information Card */}
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
              {t("teacher.grading.studentInfo")}
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-secondary block">{t("teacher.grading.studentName")}</span>
                <span className="font-semibold text-on-surface">
                  {submission.studentName || "—"}
                </span>
              </div>
              <div>
                <span className="text-secondary block">{t("teacher.grading.studentEmail")}</span>
                <span className="font-semibold text-on-surface truncate block">
                  {submission.studentEmail}
                </span>
              </div>
              <div>
                <span className="text-secondary block">{t("teacher.grading.submittedOn")}</span>
                <span className="font-medium text-on-surface">{formattedSubmittedAt}</span>
              </div>
              <div>
                <span className="text-secondary block">{t("teacher.grading.status")}</span>
                <div className="mt-1 flex items-center gap-2">
                  <AssignmentStatusBadge
                    status={submission.status}
                    isLate={submission.isLate}
                    size="sm"
                  />
                  {submission.isLate && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                      {t("teacher.assignmentDetail.lateBadge")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submitted Files List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
              {t("teacher.grading.submittedFiles", { count: submission.files.length })}
            </h4>
            {submission.files.length === 0 ? (
              <p className="text-xs text-secondary italic">
                {t("teacher.grading.noFiles")}
              </p>
            ) : (
              <div className="space-y-2">
                {submission.files.map((file) => (
                  <SubmissionFileItem
                    key={file.id}
                    file={file}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Re-grade Notice if already graded */}
          {submission.status === "graded" && formattedGradedAt && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-primary font-medium">
              {t("teacher.grading.regradeNotice", {
                date: formattedGradedAt,
                points: submission.points ?? 0,
              })}
            </div>
          )}

          {/* Grading Form */}
          <form onSubmit={handleSubmit} id="grading-form" className="space-y-4 pt-2">
            <div>
              <label htmlFor={pointsInputId} className="block text-xs font-bold text-on-surface">
                {t("teacher.grading.pointsLabel", { maxPoints: submission.assignment.maxPoints })}{" "}
                <span className="text-error">*</span>
              </label>
              <input
                id={pointsInputId}
                type="number"
                min={0}
                max={submission.assignment.maxPoints}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder={`0 - ${submission.assignment.maxPoints}`}
                required
                disabled={isSubmitting}
                className="mt-1.5 w-full max-w-xs rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor={feedbackInputId} className="block text-xs font-bold text-on-surface">
                {t("teacher.grading.feedbackLabel")}
              </label>
              <textarea
                id={feedbackInputId}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={t("teacher.grading.feedbackPlaceholder")}
                rows={5}
                maxLength={MAX_ASSIGNMENT_FEEDBACK_LENGTH}
                disabled={isSubmitting}
                className="mt-1.5 w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60 leading-relaxed font-sans"
              />
              <p className="mt-1 text-[11px] text-secondary text-right">
                {feedback.length} / {MAX_ASSIGNMENT_FEEDBACK_LENGTH}
              </p>
            </div>
          </form>
        </div>

        {/* Drawer Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-outline-variant p-6 bg-surface-container-lowest">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            {t("teacher.grading.cancel")}
          </button>

          <button
            type="submit"
            form="grading-form"
            disabled={isSubmitting || points === ""}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{t("teacher.grading.submitting")}</span>
              </>
            ) : (
              <span>{t("teacher.grading.saveGrade")}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
