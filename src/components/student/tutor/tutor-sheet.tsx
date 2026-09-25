"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";
import {
  askTutorAction,
  readTutorBudgetAction,
} from "@/app/student/actions/tutor-actions";

/**
 * R8 §4.1 — Tutor side sheet.
 *
 * A bottom-anchored panel that opens from the "Ask the tutor" button on
 * the lesson page. The chat list shows prior questions for this lesson
 * (loaded server-side and passed in `initialHistory`); the input box
 * calls `askTutorAction` server-side. Citations render as YouTube
 * embed links with `?start=<sec>` so the student can jump to the
 * exact moment in the lesson video.
 *
 * Daily budget is read on mount and after each ask; the UI shows
 * "{n} of 20 questions left today" per R8 §4.1.
 */

export type TutorHistoryMessage = {
  id: number;
  question: string;
  answer: string;
  citations: TutorCitationView[];
  lang: string;
  createdAt: string;
};

export type TutorCitationView = {
  n: number;
  lessonId: string;
  videoId: string | null;
  startSec: number | null;
  endSec: number | null;
  url: string | null;
  snippet: string;
};

interface TutorSheetProps {
  courseId: string;
  lessonId: string;
  /** Optional preset question (from the dashboard card). */
  initialQuestion?: string;
  initialHistory: TutorHistoryMessage[];
  initialBudget: { remaining: number; resetSec: number };
}

type LocalMessage = TutorHistoryMessage & { pending?: boolean };

export function TutorSheet(props: TutorSheetProps) {
  const { t, tn, locale } = useTranslations();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>(
    props.initialHistory.map((m) => ({ ...m, pending: false }))
  );
  const [draft, setDraft] = useState(props.initialQuestion ?? "");
  const [budget, setBudget] = useState(props.initialBudget);
  const [thinking, setThinking] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Refresh budget on mount (server-rendered initial may be stale).
  useEffect(() => {
    let cancelled = false;
    readTutorBudgetAction()
      .then((b) => {
        if (!cancelled) setBudget(b);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  // Reset draft when the active lesson changes. We defer the setState to a
  // microtask so we don't run state-update logic synchronously inside the
  // effect body (React 19 set-state-in-effect lint).
  useEffect(() => {
    const next = props.initialQuestion ?? "";
    queueMicrotask(() => setDraft(next));
  }, [props.lessonId, props.initialQuestion]);

  const exhausted = budget.remaining <= 0;
  const resetHours = Math.max(1, Math.ceil(budget.resetSec / 3600));

  const submit = () => {
    const text = draft.trim();
    if (!text || thinking || isPending || exhausted) return;
    const optimistic: LocalMessage = {
      id: Date.now(),
      question: text,
      answer: "",
      citations: [],
      lang: locale,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setThinking(true);
    setErrorBanner(null);
    startTransition(async () => {
      try {
        const result = await askTutorAction({
          courseId: props.courseId,
          lessonId: props.lessonId,
          question: text,
          lang: locale === "bn" ? "bn" : "en",
        });
        if (result.ok) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimistic.id
                ? {
                    ...optimistic,
                    answer: result.answer,
                    citations: result.citations,
                    pending: false,
                  }
                : m
            )
          );
          setBudget({
            remaining: result.budgetRemaining,
            resetSec: result.budgetResetSec,
          });
        } else {
          // Roll back optimistic message + surface the error.
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          setDraft(text);
          setErrorBanner(messageForError(result.error, t));
          if (result.error.kind === "rate_limited" || result.error.kind === "budget") {
            setBudget((b) => ({ ...b, remaining: 0 }));
          }
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(text);
        setErrorBanner(t("system.serverError"));
      } finally {
        setThinking(false);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 80);
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-xs transition-colors hover:border-emerald-400 hover:bg-emerald-100"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707M12 21a7 7 0 01-7-7c0-2.5 1.5-4 4-4h6c2.5 0 4 1.5 4 4a7 7 0 01-7 7z"
          />
        </svg>
        {t("tutor.openButton")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutor-sheet-title"
        >
          <button
            type="button"
            aria-label="Close tutor"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />
          <div
            className={cn(
              "relative flex h-[92dvh] w-full flex-col bg-surface-container-lowest shadow-2xl",
              "sm:h-full sm:max-w-md sm:border-l sm:border-outline-variant"
            )}
          >
            <header className="flex items-start justify-between border-b border-outline-variant px-5 py-4">
              <div>
                <h2
                  id="tutor-sheet-title"
                  className="text-base font-bold text-on-surface"
                >
                  {t("tutor.title")}
                </h2>
                <p className="mt-1 text-xs text-secondary">
                  {exhausted
                    ? t("tutor.budget.exhausted")
                    : tn("tutor.budget.remaining", budget.remaining)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-secondary hover:bg-surface-container-low"
                aria-label="Close"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </header>

            {errorBanner && (
              <div
                role="alert"
                className="border-b border-rose-200 bg-rose-50 px-5 py-2 text-xs font-medium text-rose-800"
              >
                {errorBanner}
              </div>
            )}

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 py-4"
              aria-live="polite"
            >
              {messages.length === 0 && !thinking && (
                <p className="text-sm text-secondary">{t("tutor.emptyHistory")}</p>
              )}
              <ul className="flex flex-col gap-4">
                {messages.map((m) => (
                  <li key={m.id} className="flex flex-col gap-2">
                    <div className="rounded-lg rounded-br-sm bg-primary/10 px-3 py-2 text-sm text-on-surface">
                      {m.question}
                    </div>
                    {m.answer ? (
                      <div className="rounded-lg rounded-bl-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm leading-relaxed text-on-surface">
                        <p>{m.answer}</p>
                        {m.citations.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {m.citations.map((c) => (
                              <CitationChip key={c.n} citation={c} t={t} />
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : m.pending ? (
                      <div className="rounded-lg rounded-bl-sm border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm italic text-secondary">
                        {t("tutor.thinking")}
                      </div>
                    ) : null}
                  </li>
                ))}
                {thinking && messages[messages.length - 1]?.answer && (
                  <li className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm italic text-secondary">
                    {t("tutor.thinking")}
                  </li>
                )}
              </ul>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="border-t border-outline-variant bg-surface-container-lowest px-3 py-3 sm:px-5"
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={2}
                  maxLength={800}
                  placeholder={t("tutor.placeholder")}
                  disabled={exhausted || thinking}
                  className="min-h-[44px] max-h-32 flex-1 resize-none rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm leading-relaxed text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={exhausted || thinking || !draft.trim()}
                  className="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("tutor.ask")}
                </button>
              </div>
              {exhausted && (
                <p className="mt-2 text-[11px] font-medium text-secondary">
                  {t("tutor.budget.resetAt", { hours: resetHours })}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function CitationChip({
  citation,
  t,
}: {
  citation: TutorCitationView;
  t: ReturnType<typeof useTranslations>["t"];
}) {
  const start = formatTimestamp(citation.startSec);
  const end = citation.endSec != null ? formatTimestamp(citation.endSec) : null;
  const label = end
    ? t("tutor.citation.chunk", { n: citation.n, start, end })
    : `${citation.n} · ${start}`;
  if (citation.url) {
    return (
      <li>
        <a
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 transition-colors hover:border-emerald-400 hover:bg-emerald-100"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {label}
        </a>
      </li>
    );
  }
  return (
    <li className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold text-secondary">
      {label}
    </li>
  );
}

function formatTimestamp(sec: number | null): string {
  if (sec == null || sec < 0) return "0:00";
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function messageForError(
  error:
    | { kind: "forbidden"; message: string }
    | { kind: "rate_limited"; remaining: 0; resetSec: number; reason: string }
    | { kind: "budget"; message: string; resetSec: number }
    | { kind: "unsafe"; message: string }
    | { kind: "no_context"; message: string }
    | { kind: "binding_missing"; message: string },
  t: ReturnType<typeof useTranslations>["t"]
): string {
  if (error.kind === "budget") return t("tutor.budgetExhaustedBanner");
  if (error.kind === "rate_limited") return error.reason;
  if (error.kind === "no_context") return error.message;
  if (error.kind === "unsafe") return error.message;
  if (error.kind === "forbidden") return t("system.forbidden");
  return t("tutor.unavailable");
}
