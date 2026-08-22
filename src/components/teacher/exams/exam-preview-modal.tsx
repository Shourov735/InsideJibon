"use client";

import type { ExamWithQuestions } from "@/types/exam";
import { StatusBadge } from "../status-badge";
import { useTranslations } from "@/i18n/client";

interface ExamPreviewModalProps {
  exam: ExamWithQuestions;
  courseTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ExamPreviewModal({
  exam,
  courseTitle,
  isOpen,
  onClose,
}: ExamPreviewModalProps) {
  const { t, tn } = useTranslations();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="exam-preview-modal-title">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
              {t("teacher.examPreview.title")}
            </span>
            <h3 id="exam-preview-modal-title" className="text-base font-bold text-on-surface">
              {t("teacher.examPreview.badge")}
            </h3>
            <StatusBadge
            status={exam.status}
            label={exam.status === "draft" ? t("common.status.draft") : exam.status === "published" ? t("common.status.published") : t("common.status.archived")}
          />
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

        {/* Formatted Academic Exam Paper Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Official Academic Header */}
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="font-bold text-xs uppercase tracking-widest text-primary">
                {t("teacher.examPreview.academicHeader")}
              </span>
            </div>
            {courseTitle && (
              <h2 className="text-lg font-bold text-on-surface">{courseTitle}</h2>
            )}
            <h1 className="text-xl font-extrabold text-primary">{exam.title}</h1>
            {exam.description && (
              <p className="mx-auto max-w-xl text-xs text-on-surface-variant italic">
                &ldquo;{exam.description}&rdquo;
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 border-t border-outline-variant/60 pt-3 text-xs font-semibold text-secondary">
              <span>{t("student.result.totalQuestions")}: {exam.questions.length}</span>
              <span>{t("teacher.examDetail.totalMarks", { marks: exam.totalMarks })}</span>
              <span>
                {exam.durationMinutes
                  ? t("teacher.examDetail.duration", {
                      minutes: exam.durationMinutes,
                    })
                  : t("common.status.untimed")}
              </span>
            </div>
          </div>

          {/* Instructions note */}
          <div className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4 text-xs text-on-surface-variant">
            <span className="font-bold text-on-surface">{t("teacher.examPreview.instructions")}: </span>
            {t("teacher.examPreview.instructionsBody")}
          </div>

          {/* Question List */}
          {exam.questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-sm text-secondary">
              {t("teacher.examPreview.noQuestions")}
            </div>
          ) : (
            <div className="space-y-6">
              {exam.questions.map((question) => (
                <div
                  key={question.id}
                  className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                        {question.position}
                      </span>
                      <p className="font-semibold text-sm text-on-surface whitespace-pre-wrap leading-relaxed pt-0.5">
                        {question.questionText}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-surface-container-high px-2 py-0.5 text-xs font-semibold text-secondary">
                      [{tn("common.markCountUpper", question.marks)}]
                    </span>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1">
                    {question.options.map((option) => (
                      <div
                        key={option.id}
                        className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs transition-colors ${
                          option.isCorrect
                            ? "border-emerald-400 bg-emerald-50/80 text-emerald-950 font-medium"
                            : "border-outline-variant bg-surface-container-low/60 text-on-surface"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                            option.isCorrect
                              ? "bg-emerald-600 text-white"
                              : "bg-surface-container-highest text-secondary"
                          }`}
                        >
                          {String.fromCharCode(64 + option.position)}
                        </span>
                        <span className="flex-1 break-words pt-0.5">{option.optionText}</span>
                        {option.isCorrect && (
                          <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                            {t("teacher.examDetail.correctBadge")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Explanation if any */}
                  {question.explanation && (
                    <div className="rounded-lg bg-surface-container-low p-3 text-xs text-secondary border border-outline-variant/40">
                      <span className="font-semibold text-on-surface">{t("teacher.examDetail.explanationLabel")}</span>
                      {question.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-outline-variant bg-surface-container-low px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-on-primary shadow-xs hover:bg-primary-container transition-colors"
          >
            {t("teacher.examPreview.closePreview")}
          </button>
        </div>
      </div>
    </div>
  );
}
