"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

export type LiveSessionView = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  scheduledAt: string | null;
  durationMinutes: number | null;
  status: "upcoming" | "completed" | "cancelled";
  lobbyOpensAt: string | null;
  endedAt: string | null;
  youtubeLiveVideoId: string | null;
  youtubeReplayVideoId: string | null;
  replayStatus: "none" | "available";
};

export type LiveCourseView = {
  id: string;
  title: string;
  teacherName: string | null;
};

export type LiveViewerView = {
  id: string;
  name: string | null;
  role: "student" | "teacher";
};

interface StudentLiveLobbyProps {
  locale: "en" | "bn";
  session: LiveSessionView;
  course: LiveCourseView;
  viewer: LiveViewerView;
}

/**
 * Student lobby — pre-join card. Shows the upcoming class metadata,
 * a status pill (Starting in / Live now / Replay ready), and the Join
 * CTA. The CTA is disabled until `lobbyOpensAt` passes. We re-render
 * every minute so the pill stays accurate without a router refresh.
 *
 * Server-side props carry the full session row; the in-room page is a
 * separate route (`/student/.../live/[sessionId]/room`).
 */
export function StudentLiveLobby({
  locale,
  session,
  course,
  viewer,
}: StudentLiveLobbyProps) {
  const { t } = useTranslations();
  const [, setTick] = useState(0);

  // Capture `now` in state so the "starting in" pill re-evaluates each
  // tick. `Date.now()` is impure but allowed as a useState initializer.
  const [now, setNow] = useState(() => Date.now());
  // Tick once per minute so the "starting in" pill stays accurate.
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((n) => n + 1);
      setNow(Date.now());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);
  const scheduledAtMs = session.scheduledAt ? Date.parse(session.scheduledAt) : 0;
  const lobbyOpensAtMs = session.lobbyOpensAt
    ? Date.parse(session.lobbyOpensAt)
    : Math.max(scheduledAtMs - 15 * 60_000, 0);
  const diffMs = scheduledAtMs - now;
  const canJoin = now >= lobbyOpensAtMs;
  const minutesUntilStart = Math.max(0, Math.round(diffMs / 60_000));

  const statusLabel = useMemo(() => {
    if (session.replayStatus === "available" || session.youtubeReplayVideoId) {
      return t("live.lobby.replayReady");
    }
    if (diffMs <= 0 && session.status === "upcoming") {
      return t("live.lobby.liveNow");
    }
    if (diffMs > 0 && minutesUntilStart > 0) {
      return t("live.lobby.startingIn", { minutes: minutesUntilStart });
    }
    return session.status;
  }, [diffMs, minutesUntilStart, session.replayStatus, session.status, session.youtubeReplayVideoId, t]);

  const formatter = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const scheduledLabel = session.scheduledAt
    ? formatter.format(new Date(session.scheduledAt))
    : null;

  const roomHref = `/student/courses/${session.courseId}/live/${session.id}/room`;
  const replayHref = `/student/courses/${session.courseId}/live/${session.id}/replay`;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
          {course.title}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-on-surface">
          {session.title}
        </h1>
        <p className="text-sm text-secondary">
          {viewer.name ? `Hi, ${viewer.name.split(" ")[0]}` : null}
        </p>
      </header>

      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("student.classes.classesTab")}
            </p>
            {scheduledLabel ? (
              <p className="font-display text-lg font-semibold text-on-surface">
                {scheduledLabel}
              </p>
            ) : null}
            {session.durationMinutes ? (
              <p className="text-xs text-secondary">
                {session.durationMinutes} min
              </p>
            ) : null}
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold",
              diffMs <= 0 && session.status === "upcoming"
                ? "bg-rose-100 text-rose-700"
                : session.replayStatus === "available"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-primary-container text-on-primary-container"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                diffMs <= 0 && session.status === "upcoming"
                  ? "bg-rose-500 animate-pulse"
                  : "bg-primary"
              )}
            />
            {statusLabel}
          </span>
        </div>

        {session.description ? (
          <p className="mt-4 text-sm leading-relaxed text-on-surface">
            {session.description}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {session.replayStatus === "available" || session.youtubeReplayVideoId ? (
            <Link
              href={replayHref}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors"
            >
              {t("live.lobby.watchReplay")}
            </Link>
          ) : (
            <Link
              href={roomHref}
              aria-disabled={!canJoin}
              tabIndex={canJoin ? 0 : -1}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors",
                canJoin
                  ? "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container"
                  : "pointer-events-none cursor-not-allowed bg-surface-container-high text-on-surface-variant"
              )}
            >
              {t("live.lobby.join")}
            </Link>
          )}
          {!canJoin && diffMs > 0 ? (
            <p className="text-xs text-secondary">
              {t("live.lobby.joinDisabled")}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
