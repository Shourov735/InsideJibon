"use client";

import { useState } from "react";
import type { ExamQuestionWithDetails, QuestionOption } from "@/types/exam";
import { useTranslations } from "@/i18n/client";

interface QuestionEditorProps {
  question: ExamQuestionWithDetails;
  totalQuestions: number;
  editable: boolean;
  onSaveQuestion: (data: {
    questionText: string;
    marks: number;
    explanation: string | null;
  }) => Promise<void>;
  onAddOption: (optionText: string) => Promise<void>;
  onSetCorrectOption: (option: QuestionOption) => Promise<void>;
  onUpdateOptionText: (option: QuestionOption, newText: string) => Promise<void>;
  onDeleteOption: (optionId: string) => Promise<void>;
  onPrevQuestion?: () => void;
  onNextQuestion?: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function QuestionEditor({
  question,
  totalQuestions,
  editable,
  onSaveQuestion,
  onAddOption,
  onSetCorrectOption,
  onUpdateOptionText,
  onDeleteOption,
  onPrevQuestion,
  onNextQuestion,
  hasPrev,
  hasNext,
}: QuestionEditorProps) {
  const { t, tn } = useTranslations();
  const [text, setText] = useState(question.questionText);
  const [marks, setMarks] = useState(String(question.marks));
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [newOptionText, setNewOptionText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setIsSaving(true);
    try {
      await onSaveQuestion({
        questionText: text.trim(),
        marks: Number(marks) || 1,
        explanation: explanation.trim() || null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionText.trim()) return;
    await onAddOption(newOptionText.trim());
    setNewOptionText("");
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-4xl w-full mx-auto">
      {/* Question Form Card */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-5"
      >
        {/* Header info */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
              {question.position}
            </span>
            <div>
              <h2 className="text-base font-bold text-on-surface">
                {t("teacher.examBuilder.questionOf", {
                  position: question.position,
                  total: totalQuestions,
                })}
              </h2>
              <span className="text-[11px] text-secondary">
                {question.questionType === "true_false"
                  ? t("exam.questionType.trueFalse")
                  : t("student.exam.multipleChoice")}{" "}
                • {tn("common.optionCountLower", question.options.length)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label htmlFor="marksInput" className="text-xs font-semibold text-secondary">
                {t("teacher.examBuilder.marksLabel")}
              </label>
              <input
                id="marksInput"
                type="number"
                min={1}
                max={1000}
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                disabled={!editable}
                className="w-20 rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1.5 text-xs font-semibold text-on-surface outline-none focus:border-primary disabled:opacity-50"
              />
            </div>

            {editable && (
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-on-primary shadow-xs hover:bg-primary-container hover:text-on-primary-container transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving
                  ? t("common.saving")
                  : t("teacher.examBuilder.saveQuestionText")}
              </button>
            )}
          </div>
        </div>

        {/* Question Text Field */}
        <div className="space-y-1.5">
          <label htmlFor="questionText" className="block text-xs font-bold uppercase tracking-wider text-secondary">
            {t("teacher.qe.questionText")} <span className="text-error">*</span>
          </label>
          <textarea
            id="questionText"
            rows={4}
            maxLength={5000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!editable}
            placeholder={t("teacher.examBuilder.questionPromptPlaceholder")}
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-3.5 text-sm text-on-surface outline-none focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 disabled:opacity-50 leading-relaxed font-sans"
          />
          <div className="flex justify-end text-[11px] text-outline">
            {text.length}/5000
          </div>
        </div>

        {/* Optional Explanation Field */}
        <div className="space-y-1.5">
          <label htmlFor="explanationText" className="block text-xs font-bold uppercase tracking-wider text-secondary">
            {t("teacher.examBuilder.explanationOptional")}
          </label>
          <textarea
            id="explanationText"
            rows={2}
            maxLength={5000}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            disabled={!editable}
            placeholder={t("teacher.examBuilder.explanationPlaceholder")}
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-3 text-xs text-on-surface outline-none focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 disabled:opacity-50 font-sans"
          />
        </div>
      </form>

      {/* Answer Options Card */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
          <div>
            <h3 className="text-sm font-bold text-on-surface">
              {t("teacher.examBuilder.answerOptions")}
            </h3>
            <p className="text-xs text-on-surface-variant">
              {question.questionType === "true_false"
                ? t("exam.builder.questionTypeHint")
                : t("teacher.examBuilder.answerOptionsHint")}
            </p>
          </div>

          <span className="rounded-md bg-surface-container-high px-2.5 py-1 text-xs font-semibold text-secondary">
            {tn("common.optionCountUpper", question.options.length)}
          </span>
        </div>

        {/* Options List */}
        <div className="space-y-3">
          {question.options.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-xs text-secondary">
              {t("teacher.examBuilder.noOptionsYet")}
            </div>
          ) : (
            question.options.map((option) => {
              const letter = String.fromCharCode(64 + option.position);
              const isTrueFalse = question.questionType === "true_false";

              return (
                <div
                  key={option.id}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 transition-all ${
                    option.isCorrect
                      ? "border-emerald-400 bg-emerald-50/70 shadow-2xs"
                      : "border-outline-variant bg-surface-container-lowest hover:border-outline"
                  }`}
                >
                  {/* Correct Answer Radio Selector */}
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => onSetCorrectOption(option)}
                    title={
                      option.isCorrect
                        ? t("teacher.examBuilder.correctAnswerTitle")
                        : t("teacher.examBuilder.markCorrectTitle")
                    }
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer ${
                      option.isCorrect
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-outline-variant bg-surface-container-low hover:border-primary"
                    }`}
                  >
                    {option.isCorrect && (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Letter Badge */}
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      option.isCorrect
                        ? "bg-emerald-200 text-emerald-900"
                        : "bg-surface-container-high text-secondary"
                    }`}
                  >
                    {letter}
                  </span>

                  {/* Option Text Input */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      defaultValue={option.optionText}
                      key={`${option.id}-${option.optionText}`}
                      onBlur={(e) => onUpdateOptionText(option, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                      }}
                      disabled={!editable || isTrueFalse}
                      maxLength={500}
                      placeholder={t("teacher.examBuilder.enterOptionText", { letter })}
                      className={`w-full rounded-lg border bg-transparent px-3 py-1.5 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 ${
                        option.isCorrect
                          ? "border-emerald-300 font-medium"
                          : "border-outline-variant/60"
                      } disabled:opacity-80`}
                    />
                  </div>

                  {/* Status Badge & Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    {option.isCorrect ? (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        {t("teacher.examDetail.correctBadge")}
                      </span>
                    ) : (
                      editable && (
                        <button
                          type="button"
                          onClick={() => onSetCorrectOption(option)}
                          className="text-[11px] font-semibold text-secondary hover:text-primary underline cursor-pointer"
                        >
                          {t("teacher.examBuilder.markCorrect")}
                        </button>
                      )
                    )}

                    {editable && !isTrueFalse && (
                      <button
                        type="button"
                        onClick={() => onDeleteOption(option.id)}
                        title={t("teacher.qe.deleteOption")}
                        className="rounded-lg p-1.5 text-secondary hover:bg-error-container/50 hover:text-error transition-colors cursor-pointer"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Option Form */}
        {editable && question.questionType !== "true_false" && (
          <form onSubmit={handleAddOptionSubmit} className="flex items-center gap-2.5 pt-2">
            <input
              type="text"
              value={newOptionText}
              onChange={(e) => setNewOptionText(e.target.value)}
              maxLength={500}
              placeholder={t("teacher.examBuilder.addOptionPlaceholder", {
                letter: String.fromCharCode(65 + question.options.length),
              })}
              className="flex-1 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={!newOptionText.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary shadow-xs hover:bg-primary-container hover:text-on-primary-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>{t("teacher.qe.addOption")}</span>
            </button>
          </form>
        )}
      </div>

      {/* Prev / Next Navigation Footer */}
      <div className="flex items-center justify-between border-t border-outline-variant pt-4">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={onPrevQuestion}
          className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>{t("teacher.examBuilder.previousQuestion")}</span>
        </button>

        <button
          type="button"
          disabled={!hasNext}
          onClick={onNextQuestion}
          className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span>{t("student.exam.nextQuestion")}</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
