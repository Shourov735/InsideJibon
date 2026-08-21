"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { publishAssignmentAction } from "@/app/teacher/assignments/actions";
import { useTranslations } from "@/i18n/client";
import type { Assignment } from "@/db/schema";

interface AssignmentPublishModalProps {
  assignment: Assignment;
  validation: {
    canPublish: boolean;
    errors: string[];
  };
  isOpen: boolean;
  onClose: () => void;
}

export function AssignmentPublishModal({
  assignment,
  validation,
  isOpen,
  onClose,
}: AssignmentPublishModalProps) {
  const router = useRouter();
  const { t } = useTranslations();
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePublish = async () => {
    setIsPublishing(true);
    setErrorMessage(null);

    try {
      const result = await publishAssignmentAction({
        assignmentId: assignment.id,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      onClose();
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("teacher.assignmentDetail.failedAction")
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const isTitleValid = assignment.title.trim().length >= 3;
  const isInstructionsValid = assignment.instructions.trim().length >= 10;
  const isPointsValid = assignment.maxPoints >= 1;
  const isDueDateValid = !assignment.dueAt || new Date(assignment.dueAt).getTime() > Date.now();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl space-y-6 sm:p-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 id="publish-modal-title" className="text-base font-bold text-on-surface">
                {t("teacher.assignmentPublish.title")}
              </h3>
              <p className="text-xs text-secondary">{assignment.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="rounded-lg p-1 text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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

        <p className="text-xs text-secondary leading-relaxed">
          {t("teacher.assignmentPublish.intro")}
        </p>

        {/* Pre-flight Checklist */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4 space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs">
            {isTitleValid ? (
              <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-error shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={isTitleValid ? "text-on-surface" : "text-error font-medium"}>
              {t("teacher.assignmentPublish.checklistTitle")}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            {isInstructionsValid ? (
              <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-error shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={isInstructionsValid ? "text-on-surface" : "text-error font-medium"}>
              {t("teacher.assignmentPublish.checklistInstructions")}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            {isPointsValid ? (
              <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-error shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={isPointsValid ? "text-on-surface" : "text-error font-medium"}>
              {t("teacher.assignmentPublish.checklistPoints")}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            {isDueDateValid ? (
              <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-error shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={isDueDateValid ? "text-on-surface" : "text-error font-medium"}>
              {t("teacher.assignmentPublish.checklistDueDate")}
            </span>
          </div>
        </div>

        {/* Issues list if blocked */}
        {!validation.canPublish && validation.errors.length > 0 && (
          <div className="rounded-xl border border-error/30 bg-error-container/20 p-4 space-y-1.5">
            <span className="block text-xs font-bold text-on-error-container">
              {t("teacher.assignmentPublish.issuesTitle")}
            </span>
            <ul className="list-disc pl-4 text-xs text-error space-y-0.5">
              {validation.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Ready status */}
        {validation.canPublish && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 text-xs text-emerald-900">
            <p className="font-bold">{t("teacher.assignmentPublish.readyTitle")}</p>
            <p className="mt-0.5 text-emerald-800">{t("teacher.assignmentPublish.readyDesc")}</p>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            {t("teacher.assignmentPublish.close")}
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={!validation.canPublish || isPublishing}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            {isPublishing ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{t("teacher.assignmentPublish.publishing")}</span>
              </>
            ) : (
              <span>{t("teacher.assignmentPublish.confirmPublish")}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
