"use client";

import { useCallback, useState } from "react";

import { useTranslations } from "@/i18n/client";

/**
 * R9 — Teacher proctor review timeline.
 *
 * Renders the per-attempt event timeline as a vertical rail of chips.
 * Reviewers can mark an attempt "reviewed" (clears the flag) or "void"
 * (marks the attempt as voided so it doesn't count toward analytics).
 *
 * The component is a thin presentational wrapper; the data shape is
 * `events: TimelineEvent[]` populated by the page that fetches it via
 * `services/proctoring/events.listAttemptEvents`.
 */

const EVENT_KEY_MAP = {
  "fullscreen.enter": "proctor.review.events.fullscreen.enter",
  "fullscreen.exit": "proctor.review.events.fullscreen.exit",
  "tab.blur": "proctor.review.events.tab.blur",
  "tab.focus": "proctor.review.events.tab.focus",
  "webcam.start": "proctor.review.events.webcam.start",
  "webcam.stop": "proctor.review.events.webcam.stop",
  "webcam.chunk": "proctor.review.events.webcam.chunk",
  paste: "proctor.review.events.paste",
  rightclick: "proctor.review.events.rightclick",
} as const;

export type TimelineEvent = {
  id: number;
  kind: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ProctorReviewTimelineProps = {
  attemptId: string;
  events: TimelineEvent[];
  flagged: boolean;
  flagCount: number;
  reviewedAt: string | null;
};

export function ProctorReviewTimeline({
  attemptId,
  events,
  flagged,
  flagCount,
  reviewedAt,
}: ProctorReviewTimelineProps) {
  const { t, tn, locale } = useTranslations();
  const [pending, setPending] = useState<"idle" | "accept" | "void">("idle");
  const [reviewed, setReviewed] = useState<string | null>(reviewedAt);

  const call = useCallback(
    async (action: "accept" | "void") => {
      setPending(action);
      try {
        const res = await fetch(
          `/api/exam-attempts/${attemptId}/proctor/review`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { reviewedAt: string | null };
        setReviewed(data.reviewedAt);
      } finally {
        setPending("idle");
      }
    },
    [attemptId]
  );

  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));

  return (
    <section
      aria-label={t("proctor.review.title")}
      className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xs"
      data-testid="proctor-review-timeline"
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-on-surface">
          {t("proctor.review.title")}
        </h3>
        {flagged ? (
          <span className="rounded-full bg-error-container px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-error-container">
            {t("proctor.review.flagged")}
          </span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            {t("proctor.review.clear")}
          </span>
        )}
      </header>
      {flagCount > 0 ? (
        <p className="mb-3 text-xs text-secondary">
          {tn("proctor.review.flagCount", flagCount)}
        </p>
      ) : null}
      {events.length === 0 ? (
        <p className="text-xs text-secondary">
          {t("proctor.review.noEvents")}
        </p>
      ) : (
        <ol className="relative space-y-2 border-s border-outline-variant ps-4">
          {events.map((event) => (
            <li
              key={event.id}
              className="relative"
              data-kind={event.kind}
            >
              <span className="absolute -start-[22px] mt-1.5 h-2 w-2 rounded-full bg-primary" />
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-on-surface">
                  {event.kind in EVENT_KEY_MAP
                    ? t(EVENT_KEY_MAP[event.kind as keyof typeof EVENT_KEY_MAP])
                    : event.kind}
                </span>
                <time className="text-secondary" dateTime={event.createdAt}>
                  {formatTime(event.createdAt)}
                </time>
              </div>
              {Object.keys(event.payload).length > 0 ? (
                <pre className="mt-1 overflow-x-auto rounded-md bg-surface-container-low px-2 py-1 text-[10px] text-secondary">
                  {JSON.stringify(event.payload)}
                </pre>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      <footer className="mt-4 flex items-center justify-end gap-2">
        {reviewed ? (
          <span className="text-xs text-secondary">
            {t("proctor.review.reviewedAt", {
              date: formatTime(reviewed),
            })}
          </span>
        ) : null}
        <button
          type="button"
          disabled={pending !== "idle"}
          onClick={() => call("void")}
          className="rounded-full border border-outline-variant px-3 py-1 text-xs font-semibold text-error hover:bg-error-container disabled:opacity-60"
        >
          {t("proctor.review.actions.void")}
        </button>
        <button
          type="button"
          disabled={pending !== "idle"}
          onClick={() => call("accept")}
          className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-60"
        >
          {pending === "accept"
            ? t("proctor.review.actions.accepting")
            : t("proctor.review.actions.accept")}
        </button>
      </footer>
    </section>
  );
}
