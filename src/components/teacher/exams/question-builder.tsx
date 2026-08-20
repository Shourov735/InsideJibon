"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  createOptionAction,
  createQuestionAction,
  deleteOptionAction,
  deleteQuestionAction,
  reorderQuestionsAction,
  updateOptionAction,
  updateQuestionAction,
} from "@/app/teacher/exams/actions";
import type { ExamWithQuestions } from "@/types/exam";

interface QuestionBuilderProps {
  exam: ExamWithQuestions;
}

/**
 * Minimal question builder (question + option CRUD, reordering) used to
 * verify the backend contract end-to-end. Antigravity will replace this
 * with the Stitch UI.
 */
export function QuestionBuilder({ exam }: QuestionBuilderProps) {
  const router = useRouter();
  const editable = exam.status === "draft";

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionMarks, setNewQuestionMarks] = useState("1");
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editMarks, setEditMarks] = useState("1");
  const [optionInputs, setOptionInputs] = useState<Record<string, string>>({});

  const fail = (e: unknown) =>
    setError(e instanceof Error ? e.message : "Action failed.");

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    void run(async () => {
      const res = await createQuestionAction({
        examId: exam.id,
        questionText: newQuestionText.trim(),
        marks: Number(newQuestionMarks) || 1,
        explanation: null,
      });
      if (!res.success) throw new Error(res.error);
      setNewQuestionText("");
      setNewQuestionMarks("1");
    });
  };

  const startEdit = (questionId: string, text: string, marks: number) => {
    setEditingQuestionId(questionId);
    setEditText(text);
    setEditMarks(String(marks));
  };

  const handleSaveQuestion = (e: React.FormEvent, questionId: string) => {
    e.preventDefault();
    if (!editText.trim()) return;
    void run(async () => {
      const res = await updateQuestionAction({
        examId: exam.id,
        questionId,
        questionText: editText.trim(),
        marks: Number(editMarks) || 1,
        explanation: null,
      });
      if (!res.success) throw new Error(res.error);
      setEditingQuestionId(null);
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!window.confirm("Delete this question and its options?")) return;
    void run(async () => {
      const res = await deleteQuestionAction({ examId: exam.id, questionId });
      if (!res.success) throw new Error(res.error);
    });
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const next = [...exam.questions];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    void run(async () => {
      const res = await reorderQuestionsAction({
        examId: exam.id,
        orderedQuestionIds: next.map((q) => q.id),
      });
      if (!res.success) throw new Error(res.error);
    });
  };

  const handleAddOption = (e: React.FormEvent, questionId: string) => {
    e.preventDefault();
    const text = (optionInputs[questionId] ?? "").trim();
    if (!text) return;
    void run(async () => {
      const res = await createOptionAction(
        { questionId, optionText: text, isCorrect: false },
        exam.id
      );
      if (!res.success) throw new Error(res.error);
      setOptionInputs((prev) => ({ ...prev, [questionId]: "" }));
    });
  };

  const handleToggleCorrect = (questionId: string, optionId: string, isCorrect: boolean) => {
    void run(async () => {
      const option = exam.questions
        .find((q) => q.id === questionId)
        ?.options.find((o) => o.id === optionId);
      if (!option) return;
      const res = await updateOptionAction(
        { optionId, optionText: option.optionText, isCorrect: !isCorrect },
        exam.id
      );
      if (!res.success) throw new Error(res.error);
    });
  };

  const handleDeleteOption = (questionId: string, optionId: string) => {
    void run(async () => {
      const res = await deleteOptionAction({ optionId }, exam.id);
      if (!res.success) throw new Error(res.error);
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="whitespace-pre-wrap rounded-lg border border-error-container bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
          {error}
        </div>
      )}

      {/* Add question */}
      <form
        onSubmit={handleAddQuestion}
        className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs"
      >
        <h3 className="text-sm font-bold uppercase tracking-wider text-secondary">
          Add Question
        </h3>
        <div className="mt-3 space-y-3">
          <textarea
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            rows={2}
            maxLength={5000}
            placeholder="Write the question text…"
            disabled={!editable || busy}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-on-surface-variant">
              Marks
              <input
                type="number"
                min={1}
                max={1000}
                value={newQuestionMarks}
                onChange={(e) => setNewQuestionMarks(e.target.value)}
                disabled={!editable || busy}
                className="w-24 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary disabled:opacity-50"
              />
            </label>
            <button
              type="submit"
              disabled={!editable || busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
            >
              Add Question
            </button>
          </div>
        </div>
      </form>

      {/* Questions */}
      {exam.questions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
          <p className="text-sm text-secondary">
            No questions yet. Add your first multiple-choice question above.
          </p>
        </div>
      ) : (
        <ol className="space-y-4">
          {exam.questions.map((question, index) => (
            <li
              key={question.id}
              className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {question.position}
                    </span>
                    <span className="rounded bg-surface-container-high px-2 py-0.5 text-xs font-semibold text-secondary">
                      {question.marks} {question.marks === 1 ? "mark" : "marks"}
                    </span>
                    <span className="rounded bg-surface-container-high px-2 py-0.5 text-xs font-medium text-on-surface-variant">
                      Multiple choice
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-on-surface">
                    {question.questionText}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!editable || busy || index === 0}
                    onClick={() => moveQuestion(index, -1)}
                    title="Move up"
                    className="rounded-md border border-outline-variant px-2 py-1 text-xs font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={!editable || busy || index === exam.questions.length - 1}
                    onClick={() => moveQuestion(index, 1)}
                    title="Move down"
                    className="rounded-md border border-outline-variant px-2 py-1 text-xs font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={!editable || busy}
                    onClick={() =>
                      editingQuestionId === question.id
                        ? setEditingQuestionId(null)
                        : startEdit(question.id, question.questionText, question.marks)
                    }
                    className="rounded-md border border-outline-variant px-2.5 py-1 text-xs font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-40"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={!editable || busy}
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="rounded-md border border-error/30 px-2.5 py-1 text-xs font-semibold text-error hover:bg-error-container/30 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {editingQuestionId === question.id && (
                <form
                  onSubmit={(e) => handleSaveQuestion(e, question.id)}
                  className="mt-4 space-y-3 rounded-xl bg-surface-container-low p-4"
                >
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    maxLength={5000}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                  />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-on-surface-variant">
                      Marks
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={editMarks}
                        onChange={(e) => setEditMarks(e.target.value)}
                        className="w-24 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-sm text-on-surface outline-none focus:border-primary"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary shadow-xs"
                    >
                      Save Question
                    </button>
                  </div>
                </form>
              )}

              {/* Options */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  Answer options
                </p>
                {question.options.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">
                    No options yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {question.options.map((option) => (
                      <li
                        key={option.id}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                          option.isCorrect
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-outline-variant bg-surface-container-lowest"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2 text-sm text-on-surface">
                          <span className="text-xs font-semibold text-on-surface-variant">
                            {String.fromCharCode(64 + option.position)}.
                          </span>
                          <span className="truncate">{option.optionText}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {option.isCorrect && (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                              Correct
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={!editable || busy}
                            onClick={() =>
                              handleToggleCorrect(question.id, option.id, option.isCorrect)
                            }
                            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                              option.isCorrect
                                ? "border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                                : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                            } disabled:opacity-40`}
                          >
                            {option.isCorrect ? "Unmark" : "Mark correct"}
                          </button>
                          <button
                            type="button"
                            disabled={!editable || busy}
                            onClick={() => handleDeleteOption(question.id, option.id)}
                            className="rounded-md border border-error/30 px-2.5 py-1 text-xs font-semibold text-error hover:bg-error-container/30 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  onSubmit={(e) => handleAddOption(e, question.id)}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={optionInputs[question.id] ?? ""}
                    onChange={(e) =>
                      setOptionInputs((prev) => ({
                        ...prev,
                        [question.id]: e.target.value,
                      }))
                    }
                    maxLength={500}
                    placeholder="Add an answer option…"
                    disabled={!editable || busy}
                    className="flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!editable || busy}
                    className="rounded-lg border border-outline-variant px-3.5 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
                  >
                    Add Option
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}