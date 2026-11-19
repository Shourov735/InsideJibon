"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";
import {
  askTutorAction,
  readTutorBudgetAction,
} from "@/app/student/actions/tutor-actions";

/**
 * R8 — AI Tutor side sheet.
 *
 * Enhanced with:
 * - Google Gemini 3.8 Flash intelligence
 * - Multimodal handwritten notebook / diagram photo upload
 * - Adaptive Reteaching ("Explain another way" / "অন্যভাবে বোঝান")
 * - Quick prompt chips
 * - Auto-open via ?tutor=1 or initialOpen prop
 */

export type TutorHistoryMessage = {
  id: number;
  question: string;
  answer: string;
  citations: TutorCitationView[];
  lang: string;
  createdAt: string;
  imageUrl?: string | null;
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
  initialOpen?: boolean;
}

type LocalMessage = TutorHistoryMessage & { pending?: boolean };

export function TutorSheet(props: TutorSheetProps) {
  const { t, tn, locale } = useTranslations();
  const [open, setOpen] = useState(props.initialOpen ?? false);
  const [messages, setMessages] = useState<LocalMessage[]>(
    props.initialHistory.map((m) => ({ ...m, pending: false }))
  );
  const [draft, setDraft] = useState(props.initialQuestion ?? "");
  const [budget, setBudget] = useState(props.initialBudget);
  const [thinking, setThinking] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Multimodal image state
  const [attachedImage, setAttachedImage] = useState<{
    data: string; // Base64 without data prefix
    mimeType: string;
    previewUrl: string;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nextIdRef = useRef(1);

  // Check URL query parameters for ?tutor=1 on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tutor") === "1") {
        queueMicrotask(() => setOpen(true));
      }
    }
  }, []);


  // Refresh budget on mount
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

  // Auto-scroll to bottom when messages or thinking changes
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  // Reset draft when active lesson changes
  useEffect(() => {
    const next = props.initialQuestion ?? "";
    queueMicrotask(() => setDraft(next));
  }, [props.lessonId, props.initialQuestion]);

  const exhausted = budget.remaining <= 0;
  const resetHours = Math.max(1, Math.ceil(budget.resetSec / 3600));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorBanner(
        locale === "bn"
          ? "দয়া করে JPG, PNG বা WebP ছবি নির্বাচন করুন।"
          : "Please select a JPG, PNG, or WebP image."
      );
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorBanner(
        locale === "bn"
          ? "ছবি ৫ মেগাবাইটের কম হতে হবে।"
          : "Image must be under 5 MB."
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(",");
      const base64Data = commaIndex !== -1 ? result.slice(commaIndex + 1) : result;
      setAttachedImage({
        data: base64Data,
        mimeType: file.type,
        previewUrl: result,
      });
      setErrorBanner(null);
    };
    reader.readAsDataURL(file);
    // Reset file input value so re-selecting the same file fires change
    e.target.value = "";
  };

  const removeAttachedImage = () => {
    setAttachedImage(null);
  };

  const submit = (
    overridePrompt?: string,
    mode: "standard" | "reteach" = "standard"
  ) => {
    const text = (overridePrompt ?? draft).trim();
    if ((!text && !attachedImage) || thinking || isPending || exhausted) return;

    const currentImage = attachedImage;
    const displayText =
      text ||
      (locale === "bn"
        ? "আমার খাতার এই অংশটি দেখে সমাধান বা ভুল বুঝিয়ে দিন।"
        : "Please check this handwritten work and explain.");

    const optimisticId = -(nextIdRef.current++);
    const optimistic: LocalMessage = {
      id: optimisticId,
      question: displayText,
      answer: "",
      citations: [],
      lang: locale,
      createdAt: "",
      pending: true,
      imageUrl: currentImage?.previewUrl ?? null,
    };


    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setAttachedImage(null);
    setThinking(true);
    setErrorBanner(null);

    startTransition(async () => {
      try {
        const result = await askTutorAction({
          courseId: props.courseId,
          lessonId: props.lessonId,
          question: displayText,
          lang: locale === "bn" ? "bn" : "en",
          mode,
          image: currentImage
            ? { data: currentImage.data, mimeType: currentImage.mimeType }
            : null,
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
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          setDraft(displayText);
          if (currentImage) setAttachedImage(currentImage);
          setErrorBanner(messageForError(result.error, t));
          if (result.error.kind === "rate_limited" || result.error.kind === "budget") {
            setBudget((b) => ({ ...b, remaining: 0 }));
          }
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(displayText);
        if (currentImage) setAttachedImage(currentImage);
        setErrorBanner(t("system.serverError"));
      } finally {
        setThinking(false);
      }
    });
  };

  const QUICK_CHIPS = [
    {
      id: "formulas",
      label: t("tutor.chip.formulas"),
      query:
        locale === "bn"
          ? "এই পাঠের মূল সূত্র ও গুরুত্বপূর্ণ নিয়মগুলো কী কী?"
          : "What are the core formulas and rules of this lesson?",
      mode: "standard" as const,
    },
    {
      id: "reteach",
      label: t("tutor.chip.reteach"),
      query:
        locale === "bn"
          ? "সহজ কোনো বাস্তব উপমা দিয়ে পুরো ধারণাটি অন্যভাবে বুঝিয়ে দিন।"
          : "Please explain this core concept in a different way using an intuitive real-world analogy.",
      mode: "reteach" as const,
    },
    {
      id: "example",
      label: t("tutor.chip.example"),
      query:
        locale === "bn"
          ? "একটি বাস্তব উদাহরণ দিয়ে ধাপে ধাপে সমাধান করে দেখান।"
          : "Show a step-by-step worked example with clear reasoning.",
      mode: "standard" as const,
    },
    {
      id: "simplify",
      label: t("tutor.chip.simplify"),
      query:
        locale === "bn"
          ? "এই পাঠের মূল বিষয়টি একদম সহজ ভাষায় সংক্ষেপে বুঝিয়ে বলুন।"
          : "Explain the main idea of this lesson as simply as possible.",
      mode: "standard" as const,
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 80);
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-xs transition-colors hover:border-emerald-400 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-600"
      >
        <svg
          className="h-4 w-4 shrink-0 text-emerald-700"
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
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />
          <div
            className={cn(
              "relative flex h-[92dvh] w-full flex-col bg-surface-0 shadow-2xl",
              "sm:h-full sm:max-w-lg sm:border-l sm:border-outline-variant"
            )}
          >
            {/* Header */}
            <header className="flex items-start justify-between border-b border-outline-variant bg-surface-0 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </span>
                  <h2
                    id="tutor-sheet-title"
                    className="font-display text-base font-bold text-ink-900"
                  >
                    {t("tutor.title")}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  {exhausted
                    ? t("tutor.budget.exhausted")
                    : tn("tutor.budget.remaining", budget.remaining)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-ink-400 hover:bg-surface-1 hover:text-ink-700"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>

            {/* Error Banner */}
            {errorBanner && (
              <div
                role="alert"
                className="border-b border-rose-200 bg-rose-50 px-5 py-2.5 text-xs font-medium text-rose-800"
              >
                {errorBanner}
              </div>
            )}

            {/* Messages Scroll Area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 py-4"
              aria-live="polite"
            >
              {messages.length === 0 && !thinking && (
                <div className="my-8 rounded-2xl border border-dashed border-outline-variant bg-surface-1/40 p-6 text-center">
                  <p className="text-sm font-medium text-ink-700">
                    {t("tutor.emptyHistory")}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    {locale === "bn"
                      ? "যেকোনো সমীকরণ, ধারণা বা খাতার ছবি দিয়ে প্রশ্ন করুন।"
                      : "Ask any formula, concept question, or upload a photo of your notebook."}
                  </p>
                </div>
              )}

              <ul className="flex flex-col gap-5">
                {messages.map((m) => (
                  <li key={m.id} className="flex flex-col gap-2">
                    {/* User Question Bubble */}
                    <div className="self-end rounded-2xl rounded-tr-xs bg-emerald-800 px-4 py-2.5 text-sm text-white shadow-xs max-w-[85%]">
                      {m.imageUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={m.imageUrl}
                          alt="Student upload"
                          className="mb-2 max-h-48 rounded-lg object-contain border border-emerald-700"
                        />
                      )}
                      <p className="whitespace-pre-wrap">{m.question}</p>
                    </div>

                    {/* Tutor Answer Bubble */}
                    {m.answer ? (
                      <div className="self-start rounded-2xl rounded-tl-xs border border-outline-variant bg-surface-0 px-4 py-3 text-sm leading-relaxed text-ink-900 shadow-xs max-w-[95%]">
                        <div className="prose prose-sm max-w-none text-ink-900 leading-relaxed space-y-2">
                          {renderFormattedAnswer(m.answer)}
                        </div>

                        {m.citations.length > 0 && (
                          <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-outline-variant pt-2.5">
                            {m.citations.map((c) => (
                              <CitationChip key={c.n} citation={c} t={t} />
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : m.pending ? (
                      <div className="self-start flex items-center gap-2 rounded-2xl rounded-tl-xs border border-outline-variant bg-surface-0 px-4 py-3 text-sm italic text-ink-500 shadow-xs">
                        <svg className="h-4 w-4 animate-spin text-emerald-700" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        {t("tutor.thinking")}
                      </div>
                    ) : null}
                  </li>
                ))}

                {thinking && messages[messages.length - 1]?.answer && (
                  <li className="self-start flex items-center gap-2 rounded-2xl rounded-tl-xs border border-outline-variant bg-surface-0 px-4 py-3 text-sm italic text-ink-500 shadow-xs">
                    <svg className="h-4 w-4 animate-spin text-emerald-700" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    {t("tutor.thinking")}
                  </li>
                )}
              </ul>
            </div>

            {/* Quick Prompt Chips */}
            <div className="border-t border-outline-variant/60 bg-surface-1/40 px-4 py-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => submit(chip.query, chip.mode)}
                    disabled={exhausted || thinking}
                    className="shrink-0 rounded-lg border border-outline-variant bg-surface-0 px-2.5 py-1 text-xs font-medium text-ink-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 disabled:opacity-50"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form & Image Upload */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="border-t border-outline-variant bg-surface-0 p-3 sm:p-4"
            >
              {/* Attached Image Preview */}
              {attachedImage && (
                <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachedImage.previewUrl}
                    alt="Preview"
                    className="h-12 w-12 rounded-lg object-cover border border-emerald-300"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-emerald-950">
                      {locale === "bn" ? "খাতার ছবি যুক্ত হয়েছে" : "Photo attached"}
                    </p>
                    <p className="text-[10px] text-emerald-700">
                      {locale === "bn"
                        ? "প্রশ্ন লিখে বা সরাসরি জিজ্ঞাসা করুন চাপুন"
                        : "Type a question or press Ask"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeAttachedImage}
                    className="rounded-lg p-1.5 text-emerald-800 hover:bg-emerald-100"
                    title={t("tutor.image.remove")}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex items-end gap-2">
                {/* Photo Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={exhausted || thinking}
                  title={t("tutor.image.attach")}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface-0 text-ink-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>

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
                  placeholder={
                    attachedImage
                      ? locale === "bn"
                        ? "এই ছবিতে আপনার কী প্রশ্ন রয়েছে? লিখুন..."
                        : "Ask about this photo, or submit directly..."
                      : t("tutor.placeholder")
                  }
                  disabled={exhausted || thinking}
                  className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl border border-outline-variant bg-surface-0 px-3 py-2.5 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={exhausted || thinking || (!draft.trim() && !attachedImage)}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("tutor.ask")}
                </button>
              </div>

              {exhausted && (
                <p className="mt-2 text-[11px] font-medium text-ink-500">
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
    <li className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-1 px-2 py-0.5 text-[11px] font-semibold text-ink-500">
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
  error: { kind: string; message?: string; reason?: string },
  t: ReturnType<typeof useTranslations>["t"]
): string {
  if (error.kind === "key_missing") return t("tutor.keyMissing");
  if (error.kind === "budget") return t("tutor.budgetExhaustedBanner");
  if (error.kind === "rate_limited") return error.reason || t("tutor.budget.exhausted");
  if (error.kind === "no_context") return error.message || t("tutor.safety.fallback");
  if (error.kind === "unsafe") return error.message || t("tutor.safety.fallback");
  if (error.kind === "forbidden") return t("system.forbidden");
  return error.message || t("tutor.unavailable");
}


function renderFormattedAnswer(text: string) {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((p, pIdx) => {
    const lines = p.split("\n");
    return (
      <p key={pIdx} className="leading-relaxed">
        {lines.map((line, lIdx) => (
          <span key={lIdx}>
            {lIdx > 0 && <br />}
            {line}
          </span>
        ))}
      </p>
    );
  });
}
