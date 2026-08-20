"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ExamWithQuestions } from "@/types/exam";
import {
  publishExamAction,
  unpublishExamAction,
} from "@/app/teacher/exams/actions";

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
      const qLabel = `Question ${q.position}`;
      if (!q.questionText || q.questionText.trim().length < 2) {
        questionErrors.push(`${qLabel}: Must have at least 2 characters of text.`);
      }
      if (q.marks < 1) {
        questionErrors.push(`${qLabel}: Marks must be at least 1.`);
      }
      if (q.options.length < 2) {
        questionErrors.push(`${qLabel}: Needs at least 2 answer options (currently ${q.options.length}).`);
      } else {
        const correctCount = q.options.filter((o) => o.isCorrect).length;
        if (correctCount === 0) {
          questionErrors.push(`${qLabel}: Must have 1 correct answer marked (none selected).`);
        } else if (correctCount > 1) {
          questionErrors.push(`${qLabel}: Must have exactly 1 correct answer (currently ${correctCount} selected).`);
        }
        for (const opt of q.options) {
          if (!opt.optionText || opt.optionText.trim().length === 0) {
            questionErrors.push(`${qLabel}: Has an answer option with empty text.`);
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
      setActionError(err instanceof Error ? err.message : "Failed to publish exam.");
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
      setActionError(err instanceof Error ? err.message : "Failed to unpublish exam.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                {exam.status === "published" ? "পরীক্ষা স্থিতি" : "পরীক্ষা প্রকাশ"}
              </span>
              <span className="text-xs text-secondary">• Lifecycle Control</span>
            </div>
            <h3 className="mt-1 text-lg font-bold text-on-surface">
              {exam.status === "published" ? "Exam Publishing Status" : "Publish Examination"}
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
              <p className="font-semibold">Publish Action Failed</p>
              <p className="mt-0.5">{actionError}</p>
            </div>
          )}

          <p className="text-sm text-on-surface-variant">
            {exam.status === "published"
              ? "This exam is published and live. Its question structure is frozen. To edit questions or options, unpublish it back to draft mode."
              : "Review the pre-flight checklist below. All requirements are authoritative and enforced by the examination service."}
          </p>

          {/* Checklist */}
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
              Prerequisites Checklist
            </h4>

            <div className="space-y-2.5 text-xs">
              <ChecklistItem
                passed={titleValid}
                label="Exam title (at least 3 characters)"
              />
              <ChecklistItem
                passed={descValid}
                label="Exam description / instructions (at least 10 characters)"
              />
              <ChecklistItem
                passed={hasQuestions}
                label={`At least 1 question added (Current: ${exam.questions.length})`}
              />
              <ChecklistItem
                passed={allQuestionsValid}
                label="All questions have valid text, marks (≥1), ≥2 options, and exactly 1 correct answer"
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
                <span>Items requiring resolution before publishing:</span>
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
                <strong>Ready for publication:</strong> Total of {exam.questions.length} questions ({exam.totalMarks} total marks) verified.
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
            Close
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
                  <span>Unpublishing…</span>
                </>
              ) : (
                <span>Unpublish Exam (Return to Draft)</span>
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
                  <span>Publishing…</span>
                </>
              ) : (
                <span>Confirm & Publish Exam</span>
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
