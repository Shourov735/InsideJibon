"use client";

import { useCallback, useMemo, useState } from "react";

import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

export interface ScheduleCell {
  sessionId: string;
  courseId: string;
  courseTitle: string;
  title: string;
  scheduledAt: string; // ISO
  durationMinutes: number | null;
  status: "upcoming" | "completed" | "cancelled";
  youtubeLiveVideoId: string | null;
  youtubeReplayVideoId: string | null;
  replayStatus: "none" | "available";
}

export interface ScheduleViewProps {
  locale: "en" | "bn";
  /** The Monday at 00:00 of the week being shown (server-resolved). */
  weekStartIso: string;
  weekEndIso: string;
  cells: ScheduleCell[];
  /** Server-resolved role for routing into the in-room page. */
  viewerRole: "student" | "teacher";
}

const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/**
 * R3 — Routine / schedule view.
 *
 * Mon–Sun grid (Mon is leftmost by convention). Each cell lists the
 * class sessions that day; each card links to either the lobby (upcoming)
 * or the replay (completed + replay ready). Header has a copy-iCal-link
 * and a download-iCal CTA — both pre-resolved server-side.
 */
export function ScheduleView(props: ScheduleViewProps) {
  const { t } = useTranslations();
  const weekStart = useMemo(() => new Date(props.weekStartIso), [props.weekStartIso]);
  const weekEnd = useMemo(() => new Date(props.weekEndIso), [props.weekEndIso]);
  const [copyState, setCopyState] = useState<null | "link" | "ical">(null);

  // Build 7 Mon-Sun day buckets.
  const days = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(props.locale === "bn" ? "bn-BD" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return {
        iso: d.toISOString(),
        label: fmt.format(d),
        weekdayKey: WEEKDAY_KEYS[i],
        cells: [] as ScheduleCell[],
      };
    });
  }, [props.locale, weekStart]);

  // Bucket cells into days.
  const bucketed = useMemo(() => {
    const buckets = days.map((d) => ({ ...d, cells: [] as ScheduleCell[] }));
    for (const cell of props.cells) {
      const ts = Date.parse(cell.scheduledAt);
      if (Number.isNaN(ts)) continue;
      const idx = Math.floor((ts - weekStart.getTime()) / (24 * 60 * 60 * 1000));
      if (idx < 0 || idx >= 7) continue;
      const bucket = buckets[idx]!;
      bucket.cells.push(cell);
    }
    return buckets;
  }, [days, props.cells, weekStart]);

  const timeFmt = new Intl.DateTimeFormat(props.locale === "bn" ? "bn-BD" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const copyIcalLink = useCallback(async () => {
    const url = `${window.location.origin}/api/live/ical`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("ical");
      setTimeout(() => setCopyState(null), 2_500);
    } catch {
      /* ignore — older browsers */
    }
  }, []);

  const downloadIcal = useCallback(() => {
    window.location.href = "/api/live/ical";
    setCopyState("ical");
    setTimeout(() => setCopyState(null), 2_500);
  }, []);

  const headerDateLabel = new Intl.DateTimeFormat(
    props.locale === "bn" ? "bn-BD" : "en-US",
    {
      month: "short",
      day: "numeric",
    }
  ).formatRange(weekStart, weekEnd);

  const basePath =
    props.viewerRole === "teacher" ? "/teacher/courses" : "/student/courses";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">
          {t("schedule.weekOf", { date: headerDateLabel })}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyIcalLink}
            className="rounded-lg border border-outline-variant bg-surface-container px-3 py-1.5 text-xs font-semibold hover:bg-surface-container-high"
          >
            {copyState === "ical" ? t("schedule.icalDownloaded") : t("schedule.exportIcal")}
          </button>
          <a
            href="/api/live/ical"
            download
            onClick={(e) => {
              e.preventDefault();
              downloadIcal();
            }}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary hover:bg-primary-container hover:text-on-primary-container"
          >
            {t("schedule.exportIcal")}
          </a>
        </div>
      </div>

      {props.cells.length === 0 ? (
        <p className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
          {t("schedule.empty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {bucketed.map((bucket) => (
            <div
              key={bucket.iso}
              className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
                {t(`schedule.${bucket.weekdayKey}`)}
              </p>
              <p className="text-xs text-on-surface-variant">{bucket.label}</p>
              <ul className="mt-2 space-y-2">
                {bucket.cells.length === 0 ? (
                  <li className="text-[10px] text-on-surface-variant">—</li>
                ) : (
                  bucket.cells.map((cell) => {
                    const isUpcoming = cell.status === "upcoming";
                    const isReplay =
                      cell.replayStatus === "available" || !!cell.youtubeReplayVideoId;
                    const href = isUpcoming
                      ? `${basePath}/${cell.courseId}/live/${cell.sessionId}`
                      : isReplay
                        ? `${basePath}/${cell.courseId}/live/${cell.sessionId}/replay`
                        : `${basePath}/${cell.courseId}/live/${cell.sessionId}`;
                    return (
                      <li
                        key={cell.sessionId}
                        className={cn(
                          "rounded-lg border px-2 py-1.5 text-xs",
                          isReplay
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : isUpcoming
                              ? "border-primary/30 bg-primary-container/40 text-on-surface"
                              : "border-outline-variant bg-surface-container text-on-surface-variant"
                        )}
                      >
                        <a href={href} className="block">
                          <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                            {cell.courseTitle}
                          </p>
                          <p className="text-xs font-semibold leading-snug">
                            {cell.title}
                          </p>
                          <p className="text-[10px] opacity-70">
                            {timeFmt.format(new Date(cell.scheduledAt))}
                            {cell.durationMinutes
                              ? ` · ${cell.durationMinutes} min`
                              : ""}
                          </p>
                        </a>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
