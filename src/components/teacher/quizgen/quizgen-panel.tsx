"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";
import {
  generateQuizAction,
  acceptQuizDraftAction,
  discardQuizDraftAction,
  type GenerateQuizActionResult,
} from "@/app/teacher/courses/actions/quiz-actions";

/**
 * R8 §4.2 — Teacher-side AI quiz generator UI.
 *
 * "AI practice" panel for the lesson editor. Generates a draft quiz from
 * the lesson's indexed captions (R8 §3.6) and lets the teacher edit +
 * accept / discard. The accepted draft becomes the source of truth for
 * the question set; the actual publishing into the existing quiz table
 * is left to a future phase (R8 only persists the draft per spec).
 */

interface QuizGenPanelProps {
  courseId: string;
  lessonId?: string | null;
}

type QuizQuestion = {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export function QuizGenPanel({ courseId, lessonId }: QuizGenPanelProps) {
  const { t } = useTranslations();
  const [count, setCount] = useState(5);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const generate = () => {
    setError(null);
    startTransition(async () => {
      const result = (await generateQuizAction({
        courseId,
        lessonId: lessonId ?? null,
        count,
      })) as GenerateQuizActionResult;
      if (!result.ok) {
        setError(messageForKind(result.kind, t));
        return;
      }
      setDraftId(result.draftId);
      setQuestions(result.quiz.questions);
      setEditing(true);
    });
  };

  const accept = () => {
    if (!draftId) return;
    startTransition(async () => {
      const result = await acceptQuizDraftAction({ draftId });
      if (!result.ok) {
        setError(t("system.serverError"));
        return;
      }
      setDraftId(null);
      setQuestions([]);
      setEditing(false);
    });
  };

  const discard = () => {
    if (!draftId) return;
    startTransition(async () => {
      const result = await discardQuizDraftAction({ draftId });
      if (!result.ok) {
        setError(t("system.serverError"));
        return;
      }
      setDraftId(null);
      setQuestions([]);
      setEditing(false);
    });
  };

  const updateQuestion = (idx: number, patch: Partial<QuizQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q))
    );
  };

  return (
    <section
      aria-label={t("quizgen.title")}
      className="flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-on-surface">
            {t("quizgen.title")}
          </h3>
          <p className="mt-1 text-xs text-secondary">
            {t("quizgen.emptyState")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-secondary">
            <span>{t("quizgen.count", { count })}</span>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-outline-variant"
            />
          </label>
          <button
            type="button"
            onClick={generate}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container disabled:opacity-50"
          >
            {t("quizgen.generate")}
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800"
        >
          {error}
        </div>
      )}

      {editing && questions.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-secondary">
            {t("quizgen.draftReady")}
          </p>
          <ol className="flex flex-col gap-3">
            {questions.map((q, qi) => (
              <li
                key={qi}
                className="rounded-xl border border-outline-variant bg-surface-container-low p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">
                  Q{qi + 1}
                </p>
                <textarea
                  value={q.text}
                  onChange={(e) =>
                    updateQuestion(qi, { text: e.target.value })
                  }
                  rows={2}
                  className="mt-1 w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <ul className="mt-3 flex flex-col gap-2">
                  {q.options.map((opt, oi) => {
                    const isCorrect = oi === q.correctIndex;
                    return (
                      <li
                        key={oi}
                        className={cn(
                          "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                          isCorrect
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-outline-variant bg-surface-container-lowest"
                        )}
                      >
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={isCorrect}
                          onChange={() =>
                            updateQuestion(qi, { correctIndex: oi })
                          }
                          className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-emerald-600"
                          aria-label={`Mark option ${oi + 1} correct`}
                        />
                        <input
                          value={opt}
                          onChange={(e) => {
                            const next = q.options.slice();
                            next[oi] = e.target.value;
                            updateQuestion(qi, { options: next });
                          }}
                          className="flex-1 bg-transparent text-on-surface focus:outline-none"
                        />
                      </li>
                    );
                  })}
                </ul>
                <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-secondary">
                  Explanation
                </label>
                <textarea
                  value={q.explanation}
                  onChange={(e) =>
                    updateQuestion(qi, { explanation: e.target.value })
                  }
                  rows={2}
                  className="mt-1 w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </li>
            ))}
          </ol>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={discard}
              disabled={isPending}
              className="inline-flex items-center rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-sm font-medium text-on-surface transition-colors hover:border-primary-40 hover:text-primary disabled:opacity-50"
            >
              {t("quizgen.discard")}
            </button>
            <button
              type="button"
              onClick={accept}
              disabled={isPending}
              className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {t("quizgen.publish")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function messageForKind(
  kind: NonNullable<Extract<GenerateQuizActionResult, { ok: false }>["kind"]>,
  t: ReturnType<typeof useTranslations>["t"]
): string {
  switch (kind) {
    case "no_chunks":
      return t("quizgen.emptyState");
    case "rate_limited":
      return t("tutor.budget.exhausted");
    case "budget":
      return t("tutor.budgetExhaustedBanner");
    case "forbidden":
      return t("system.forbidden");
    case "parse_failed":
    case "binding_missing":
      return t("system.serverError");
  }
}