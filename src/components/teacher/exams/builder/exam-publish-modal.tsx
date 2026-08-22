"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ExamWithQuestions } from "@/types/exam";
import {
  publishExamAction,
  unpublishExamAction,
} from "@/app/teacher/exams/actions";
import { useTranslations } from "@/i18n/client";

interface ExamPublishModalProps {
  exam: ExamWithQuestions;
  isOpen: boolean;
  onClose: () => void;
  serverErrors?: string[];
}

export function ExamPublishModal({
  exam,
  isOpen,
  onClose,
  serverErrors = [],
}: ExamPublishModalProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate live checklist conditions
  const titleValid = Boolean(exam.title && exam.title.trim().length >= 3);
  const descValid = Boolean(exam.description && exam.description.trim().length >= 10);
  const hasQuestions = exam.questions.length >= 1;

  // Per-question validation checks
  const questionErrors: string[] = [];

  if (hasQuestions) {
    for (const q of exam.questions) {
      if (!q.questionText || q.questionText.trim().length < 2) {
        questionErrors.push(
          t("teacher.examPublish.qErrorText", { position: q.position })
        );
      }
      if (q.marks < 1) {
        questionErrors.push(
          t("teacher.examPublish.qErrorMarks", { position: q.position })
        );
      }
      if (q.options.length < 2) {
        questionErrors.push(
          t("teacher.examPublish.qErrorOptions", {
            position: q.position,
            count: q.options.length,
          })
        );
      } else {
        const correctCount = q.options.filter((o) => o.isCorrect).length;
        if (correctCount === 0) {
          questionErrors.push(
            t("teacher.examPublish.qErrorNoCorrect", { position: q.position })
          );
        } else if (correctCount > 1) {
          questionErrors.push(
            t("teacher.examPublish.qErrorManyCorrect", {
              position: q.position,
              count: correctCount,
            })
          );
        }
        for (const opt of q.options) {
          if (!opt.optionText || opt.optionText.trim().length === 0) {
            questionErrors.push(
              t("teacher.examPublish.qErrorEmptyOption", {
                position: q.position,
              })
            );
            break;
          }
        }
      }
    }
  }

  const allQuestionsValid = hasQuestions && questionErrors.length === 0;
  const canPublish = titleValid && descValid && hasQuestions && allQuestionsValid && serverErrors.length === 0;

  const handlePublish = async () => {
    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await publishExamAction({ examId: exam.id });
      if (!res.success) {
        setActionError(res.error);
        return;
      }
      router.refresh();
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("teacher.examPublish.failedPublish"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnpublish = async () => {
    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await unpublishExamAction({ examId: exam.id });
      if (!res.success) {
        setActionError(res.error);
        return;
      }
      router.refresh();
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("teacher.examDetail.failedUnpublish"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="exam-publish-modal-title">
      <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                {exam.status === "published"
                  ? t("teacher.examPublish.statusBadgePublished")
                  : t("teacher.examPublish.statusBadgeDraft")}
              </span>
              <span className="text-xs text-secondary">
                • {t("teacher.examDetail.lifecycleControl")}
              </span>
            </div>
            <h3 id="exam-publish-modal-title" className="mt-1 text-lg font-bold text-on-surface">
              {exam.status === "published"
                ? t("teacher.examPublish.titlePublished")
                : t("teacher.examPublish.titleDraft")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {actionError && (
            <div className="rounded-xl border border-error-container bg-error-container/40 p-3.5 text-xs text-on-error-container">
              <p className="font-semibold">{t("teacher.examPublish.actionFailed")}</p>
              <p className="mt-0.5">{actionError}</p>
            </div>
          )}

          <p className="text-sm text-on-surface-variant">
            {exam.status === "published"
              ? t("teacher.examPublish.publishedDesc")
              : t("teacher.examPublish.checklistIntro")}
          </p>

          {/* Checklist */}
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
              {t("teacher.builder.prerequisitesChecklist")}
            </h4>

            <div className="space-y-2.5 text-xs">
              <ChecklistItem
                passed={titleValid}
                label={t("teacher.examPublish.checklistTitle")}
              />
              <ChecklistItem
                passed={descValid}
                label={t("teacher.examPublish.checklistDescription")}
              />
              <ChecklistItem
                passed={hasQuestions}
                label={t("teacher.examPublish.checklistQuestions", {
                  count: exam.questions.length,
                })}
              />
              <ChecklistItem
                passed={allQuestionsValid}
                label={t("teacher.examPublish.checklistQuestionsValid")}
              />
            </div>
          </div>

          {/* Issues / Errors if any */}
          {(questionErrors.length > 0 || serverErrors.length > 0) && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs uppercase tracking-wider">
                <svg className="h-4 w-4 shrink-0 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{t("teacher.examPublish.itemsRequiringResolution")}</span>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-amber-900 list-disc list-inside">
                {questionErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
                {serverErrors.map((err, idx) => (
                  <li key={`srv-${idx}`}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {exam.status === "draft" && canPublish && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-center gap-2.5">
              <svg className="h-5 w-5 text-emerald-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>
                <strong>{t("teacher.examPublish.readyForPublication")}</strong>{" "}
                {t("teacher.examPublish.readyDesc", {
                  count: exam.questions.length,
                  marks: exam.totalMarks,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-outline-variant pt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-semibold text-secondary transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            {t("teacher.examPreview.close")}
          </button>

          {exam.status === "published" ? (
            <button
              type="button"
              onClick={handleUnpublish}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{t("teacher.examDetail.unpublishing")}</span>
                </>
              ) : (
                <span>{t("teacher.examPublish.unpublishExam")}</span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish || isProcessing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{t("teacher.examPublish.publishing")}</span>
                </>
              ) : (
                <span>{t("teacher.examPublish.confirmPublish")}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {passed ? (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ) : (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-error-container text-on-error-container">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}
      <span className={passed ? "text-on-surface font-medium" : "text-error font-medium"}>
        {label}
      </span>
    </div>
  );
}
