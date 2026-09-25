"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ExamWithQuestions, QuestionOption } from "@/types/exam";
import {
  createOptionAction,
  createQuestionAction,
  deleteOptionAction,
  deleteQuestionAction,
  reorderQuestionsAction,
  updateOptionAction,
  updateQuestionAction,
} from "@/app/teacher/exams/actions";
import { StatusBadge } from "@/components/teacher/status-badge";
import { useTranslations } from "@/i18n/client";
import { ExamPublishModal } from "./exam-publish-modal";
import { ExamPreviewModal } from "@/components/teacher/exams/exam-preview-modal";
import { QuestionEditor } from "./question-editor";
import { ExamBuilderQuestionCard } from "./exam-builder-question-card";
import { ExamBuilderSettingsPanel } from "./exam-builder-settings-panel";

interface ExamBuilderProps {
  exam: ExamWithQuestions;
  courseTitle?: string;
}

type SaveState = "saved" | "saving" | "error";

/**
 * R0 §4.2: orchestrator. State ownership is unchanged from the
 * monolith — we only delegate rendering of repeated UI patterns:
 *   - <ExamBuilderQuestionCard /> — each row in the question list.
 *   - <ExamBuilderSettingsPanel /> — read-only metrics chip row.
 * The QuestionEditor (per-question editor) was already a separate
 * file before R0; we leave it intact.
 */
export function ExamBuilder({ exam, courseTitle }: ExamBuilderProps) {
  const { t, tn } = useTranslations();
  const router = useRouter();
  const editable = exam.status === "draft";

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  const activeQuestionId =
    selectedQuestionId && exam.questions.some((q) => q.id === selectedQuestionId)
      ? selectedQuestionId
      : exam.questions[0]?.id ?? null;

  const activeQuestion = exam.questions.find((q) => q.id === activeQuestionId);
  const activeIndex = exam.questions.findIndex((q) => q.id === activeQuestionId);

  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"questions" | "editor">(
    exam.questions.length > 0 ? "editor" : "questions"
  );
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestionFormText, setNewQuestionFormText] = useState("");
  const [newQuestionFormMarks, setNewQuestionFormMarks] = useState("1");
  const [newQuestionFormType, setNewQuestionFormType] = useState<
    "multiple_choice" | "true_false"
  >("multiple_choice");

  const runAction = async (fn: () => Promise<unknown>) => {
    setErrorMessage(null);
    setSaveState("saving");
    try {
      await fn();
      setSaveState("saved");
      router.refresh();
    } catch (err) {
      setSaveState("error");
      setErrorMessage(
        err instanceof Error ? err.message : t("teacher.examBuilder.actionFailed")
      );
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionFormText.trim()) return;

    await runAction(async () => {
      const res = await createQuestionAction({
        examId: exam.id,
        questionType: newQuestionFormType,
        questionText: newQuestionFormText.trim(),
        marks: Number(newQuestionFormMarks) || 1,
        explanation: null,
      });

      if (!res.success) throw new Error(res.error);

      setNewQuestionFormText("");
      setNewQuestionFormMarks("1");
      setNewQuestionFormType("multiple_choice");
      setIsAddingQuestion(false);
      setSelectedQuestionId(res.data.id);
      setMobileTab("editor");
    });
  };

  const handleQuickAddQuestion = async () => {
    await runAction(async () => {
      const defaultText = t("common.questionLabel", {
        position: exam.questions.length + 1,
      });
      const res = await createQuestionAction({
        examId: exam.id,
        questionType: "multiple_choice",
        questionText: defaultText,
        marks: 1,
        explanation: null,
      });

      if (!res.success) throw new Error(res.error);

      await createOptionAction(
        { questionId: res.data.id, optionText: t("teacher.qe.option", { position: 1 }), isCorrect: true },
        exam.id
      );
      await createOptionAction(
        { questionId: res.data.id, optionText: t("teacher.qe.option", { position: 2 }), isCorrect: false },
        exam.id
      );

      setSelectedQuestionId(res.data.id);
      setMobileTab("editor");
    });
  };

  const handleQuickAddTrueFalseQuestion = async () => {
    await runAction(async () => {
      const defaultText = t("common.questionLabel", {
        position: exam.questions.length + 1,
      });
      const res = await createQuestionAction({
        examId: exam.id,
        questionType: "true_false",
        questionText: defaultText,
        marks: 1,
        explanation: null,
      });

      if (!res.success) throw new Error(res.error);

      setSelectedQuestionId(res.data.id);
      setMobileTab("editor");
    });
  };

  const handleSaveQuestion = async (data: {
    questionText: string;
    marks: number;
    explanation: string | null;
  }) => {
    if (!activeQuestion) return;
    await runAction(async () => {
      const res = await updateQuestionAction({
        examId: exam.id,
        questionId: activeQuestion.id,
        questionText: data.questionText,
        marks: data.marks,
        explanation: data.explanation,
      });
      if (!res.success) throw new Error(res.error);
    });
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm(t("teacher.examBuilder.deleteQuestionConfirm"))) return;
    await runAction(async () => {
      const res = await deleteQuestionAction({ examId: exam.id, questionId });
      if (!res.success) throw new Error(res.error);
    });
  };

  const handleMoveQuestion = async (currentIndex: number, direction: -1 | 1) => {
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= exam.questions.length) return;

    const list = [...exam.questions];
    const [moved] = list.splice(currentIndex, 1);
    list.splice(targetIndex, 0, moved);

    await runAction(async () => {
      const res = await reorderQuestionsAction({
        examId: exam.id,
        orderedQuestionIds: list.map((q) => q.id),
      });
      if (!res.success) throw new Error(res.error);
    });
  };

  const handleAddOption = async (optionText: string) => {
    if (!activeQuestion || !optionText.trim()) return;
    const isFirstOption = activeQuestion.options.length === 0;

    await runAction(async () => {
      const res = await createOptionAction(
        {
          questionId: activeQuestion.id,
          optionText: optionText.trim(),
          isCorrect: isFirstOption,
        },
        exam.id
      );
      if (!res.success) throw new Error(res.error);
    });
  };

  const handleSetCorrectOption = async (option: QuestionOption) => {
    if (!editable) return;
    await runAction(async () => {
      const res = await updateOptionAction(
        { optionId: option.id, optionText: option.optionText, isCorrect: true },
        exam.id
      );
      if (!res.success) throw new Error(res.error);
    });
  };

  const handleUpdateOptionText = async (
    option: QuestionOption,
    newText: string
  ) => {
    if (!editable || !newText.trim() || newText.trim() === option.optionText) return;
    await runAction(async () => {
      const res = await updateOptionAction(
        { optionId: option.id, optionText: newText.trim(), isCorrect: option.isCorrect },
        exam.id
      );
      if (!res.success) throw new Error(res.error);
    });
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!editable) return;
    await runAction(async () => {
      const res = await deleteOptionAction({ optionId }, exam.id);
      if (!res.success) throw new Error(res.error);
    });
  };

  const statusLabel =
    exam.status === "draft"
      ? t("common.status.draft")
      : exam.status === "published"
        ? t("common.status.published")
        : t("common.status.archived");

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-surface text-on-surface overflow-hidden">
      <header className="flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-3 sm:px-6 shrink-0 z-30 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href={`/teacher/exams/${exam.id}`}
            className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-low px-2 sm:px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors shrink-0"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">
              {t("teacher.examBuilder.examOverview")}
            </span>
          </Link>

          <div className="h-5 w-px bg-outline-variant hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-base font-bold tracking-tight text-on-surface max-w-[120px] sm:max-w-xs md:max-w-md truncate">
                {exam.title}
              </h1>
              <div className="shrink-0">
                <StatusBadge
                  status={exam.status}
                  label={statusLabel}
                />
              </div>
            </div>
            {courseTitle ? (
              <p className="text-[11px] text-secondary truncate hidden sm:block">
                {t("teacher.examBuilder.courseLabel", { title: courseTitle })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {saveState === "saving" ? (
            <div className="hidden items-center gap-1.5 text-xs font-medium md:flex">
              <span className="flex items-center gap-1.5 text-secondary">
                <svg
                  className="h-3.5 w-3.5 animate-spin text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {t("common.saving")}
              </span>
            </div>
          ) : null}

          {saveState === "saved" ? (
            <div className="hidden items-center gap-1 text-xs font-medium md:flex">
              <span className="flex items-center gap-1 text-emerald-700">
                <svg
                  className="h-3.5 w-3.5 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {t("common.saved")}
              </span>
            </div>
          ) : null}

          {saveState === "error" ? (
            <div className="hidden items-center gap-1 text-xs font-medium md:flex">
              <span className="flex items-center gap-1 text-error">
                <svg
                  className="h-3.5 w-3.5 text-error"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {t("teacher.examBuilder.errorSaving")}
              </span>
            </div>
          ) : null}

          <ExamBuilderSettingsPanel
            questionCount={exam.questions.length}
            totalMarks={exam.totalMarks}
            durationMinutes={exam.durationMinutes}
          />

          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-low px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            <svg
              className="h-4 w-4 text-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span className="hidden sm:inline">
              {t("teacher.examBuilder.previewPaper")}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 sm:px-4 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
              exam.status === "published"
                ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                : "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>
              {exam.status === "published"
                ? t("teacher.examBuilder.publishingStatus")
                : t("teacher.examBuilder.publishExam")}
            </span>
          </button>
        </div>
      </header>

      {!editable ? (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2.5 text-xs text-amber-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-amber-800 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>
              <strong>{t("teacher.examBuilder.structureLocked")}</strong>{" "}
              {t("teacher.examBuilder.structureLockedDesc", { status: statusLabel })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            className="rounded-md border border-amber-400 bg-amber-200 px-2.5 py-1 font-bold text-amber-900 hover:bg-amber-300 text-[11px] cursor-pointer"
          >
            {t("teacher.examBuilder.unpublish")}
          </button>
        </div>
      ) : null}

      <div className="flex border-b border-outline-variant bg-surface-container-low sm:hidden shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab("questions")}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
            mobileTab === "questions"
              ? "border-primary text-primary bg-surface-container-lowest"
              : "border-transparent text-secondary hover:text-on-surface"
          }`}
        >
          {t("teacher.examDetail.stats.questions")} ({exam.questions.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("editor")}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
            mobileTab === "editor"
              ? "border-primary text-primary bg-surface-container-lowest"
              : "border-transparent text-secondary hover:text-on-surface"
          }`}
        >
          {activeQuestion
            ? t("teacher.examBuilder.questionEditorPosition", {
                position: activeQuestion.position,
              })
            : t("teacher.examBuilder.questionEditor")}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`w-full sm:w-80 lg:w-96 flex flex-col border-r border-outline-variant bg-surface-container-lowest shrink-0 overflow-hidden ${
            mobileTab === "questions" ? "flex" : "hidden sm:flex"
          }`}
        >
          <div className="p-4 border-b border-outline-variant bg-surface-container-low shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-secondary">
                ({tn("common.questionCountUpper", exam.questions.length)})
              </h2>
              <span className="text-xs font-semibold text-primary">
                {t("student.exam.totalMarksLabel", { marks: exam.totalMarks })}
              </span>
            </div>

            {editable ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickAddQuestion}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-on-primary shadow-xs hover:bg-primary-container hover:text-on-primary-container transition-colors cursor-pointer"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span>{t("exam.builder.addMcqQuestion")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickAddTrueFalseQuestion}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    <span>{t("exam.builder.addTrueFalseQuestion")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingQuestion(!isAddingQuestion)}
                    title={t("teacher.examBuilder.addWithCustomText")}
                    className="rounded-xl border border-outline-variant bg-surface-container-lowest p-2 text-secondary hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ) : null}

            {isAddingQuestion && editable ? (
              <form
                onSubmit={handleCreateQuestion}
                className="mt-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 space-y-2.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-on-surface">
                    {t("teacher.examBuilder.newQuestion")}
                  </p>
                  <select
                    value={newQuestionFormType}
                    onChange={(e) =>
                      setNewQuestionFormType(
                        e.target.value as "multiple_choice" | "true_false"
                      )
                    }
                    className="rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1 text-[11px] text-on-surface outline-none"
                  >
                    <option value="multiple_choice">
                      {t("exam.questionType.multipleChoice")}
                    </option>
                    <option value="true_false">
                      {t("exam.questionType.trueFalse")}
                    </option>
                  </select>
                </div>
                <textarea
                  value={newQuestionFormText}
                  onChange={(e) => setNewQuestionFormText(e.target.value)}
                  rows={2}
                  placeholder={t("teacher.examBuilder.enterQuestionText")}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low p-2 text-xs text-on-surface outline-none focus:border-primary"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={newQuestionFormMarks}
                    onChange={(e) => setNewQuestionFormMarks(e.target.value)}
                    placeholder={t("teacher.qe.marks")}
                    className="w-20 rounded-lg border border-outline-variant bg-surface-container-low p-1.5 text-xs text-on-surface outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-on-primary hover:bg-primary-container cursor-pointer"
                  >
                    {t("teacher.builder.add")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingQuestion(false)}
                    className="rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs text-secondary hover:bg-surface-container cursor-pointer"
                  >
                    {t("teacher.examForm.cancel")}
                  </button>
                </div>
              </form>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {exam.questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-xs text-secondary space-y-2">
                <p>{t("teacher.examBuilder.noQuestionsCreated")}</p>
                <p className="text-[11px] text-outline">
                  {t("teacher.examBuilder.noQuestionsHint")}
                </p>
              </div>
            ) : (
              exam.questions.map((question, idx) => (
                <ExamBuilderQuestionCard
                  key={question.id}
                  position={question.position}
                  marks={question.marks}
                  questionText={question.questionText}
                  optionCount={question.options.length}
                  correctCount={question.options.filter((o) => o.isCorrect).length}
                  selected={question.id === activeQuestionId}
                  editable={editable}
                  isFirst={idx === 0}
                  isLast={idx === exam.questions.length - 1}
                  onSelect={() => {
                    setSelectedQuestionId(question.id);
                    setMobileTab("editor");
                  }}
                  onMoveUp={() => handleMoveQuestion(idx, -1)}
                  onMoveDown={() => handleMoveQuestion(idx, 1)}
                  onDelete={() => handleDeleteQuestion(question.id)}
                />
              ))
            )}
          </div>
        </aside>

        <main
          className={`flex-1 flex flex-col bg-surface overflow-y-auto ${
            mobileTab === "editor" ? "flex" : "hidden sm:flex"
          }`}
        >
          {errorMessage ? (
            <div className="m-4 mb-0 flex items-start gap-3 rounded-xl border border-error-container bg-error-container/40 p-4 text-xs text-on-error-container">
              <svg
                className="h-4 w-4 shrink-0 text-error mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="font-semibold">{t("teacher.examBuilder.actionError")}</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          ) : null}

          {activeQuestion ? (
            <QuestionEditor
              key={activeQuestion.id}
              question={activeQuestion}
              totalQuestions={exam.questions.length}
              editable={editable}
              onSaveQuestion={handleSaveQuestion}
              onAddOption={handleAddOption}
              onSetCorrectOption={handleSetCorrectOption}
              onUpdateOptionText={handleUpdateOptionText}
              onDeleteOption={handleDeleteOption}
              hasPrev={activeIndex > 0}
              hasNext={activeIndex < exam.questions.length - 1}
              onPrevQuestion={() =>
                setSelectedQuestionId(exam.questions[activeIndex - 1].id)
              }
              onNextQuestion={() =>
                setSelectedQuestionId(exam.questions[activeIndex + 1].id)
              }
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-high text-secondary">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-bold text-on-surface">
                {t("teacher.examBuilder.noQuestionSelected")}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-secondary">
                {t("teacher.examBuilder.noQuestionSelectedDesc")}
              </p>
              {editable ? (
                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleQuickAddQuestion}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary shadow-xs hover:bg-primary-container transition-colors cursor-pointer"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span>{t("exam.builder.addMcqQuestion")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickAddTrueFalseQuestion}
                    className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    <span>{t("exam.builder.addTrueFalseQuestion")}</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </main>
      </div>

      <ExamPublishModal
        exam={exam}
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
      />

      <ExamPreviewModal
        exam={exam}
        courseTitle={courseTitle}
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
      />
    </div>
  );
}
