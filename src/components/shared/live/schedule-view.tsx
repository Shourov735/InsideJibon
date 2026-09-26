"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";

import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

import { Button } from "@/components/shared/ui/button";
import {
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  TrophyIcon,
} from "@/components/shared/ui/icons";

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
          <CalendarIcon size={18} className="text-primary" />
          {t("schedule.weekOf", { date: headerDateLabel })}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyIcalLink}
          >
            {copyState === "ical" ? t("schedule.icalDownloaded") : t("schedule.exportIcal")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={downloadIcal}
          >
            {t("schedule.exportIcal")}
          </Button>
        </div>
      </div>

      {props.cells.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-outline-variant bg-surface-0 p-8 text-center text-sm text-ink-500">
          {t("schedule.empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {bucketed.map((bucket) => {
            const isToday = bucket.iso.slice(0, 10) === todayIso.slice(0, 10);
            return (
              <div
                key={bucket.iso}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border p-3 transition-colors",
                  isToday
                    ? "border-primary bg-primary-container/15"
                    : "border-outline-variant bg-surface-0",
                )}
              >
                <div>
                  <p
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      isToday ? "text-primary" : "text-ink-500",
                    )}
                  >
                    {t(`schedule.${bucket.weekdayKey}`)}
                  </p>
                  <p className="text-xs font-semibold text-ink-900">{bucket.label}</p>
                </div>
                <ul className="space-y-2">
                  {bucket.cells.length === 0 ? (
                    <li className="text-[10px] italic text-ink-500">—</li>
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
                        <li key={cell.sessionId}>
                          <Link
                            href={href}
                            className={cn(
                              "block rounded-xl border p-2.5 text-xs transition-colors",
                              isReplay
                                ? "border-emerald-200 bg-emerald-50/70 hover:border-emerald-300"
                                : isUpcoming
                                  ? "border-primary/30 bg-primary-container/30 hover:border-primary/60"
                                  : "border-outline-variant bg-surface-1 hover:bg-surface-2",
                            )}
                          >
                            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide opacity-90">
                              {isReplay ? (
                                <TrophyIcon size={10} />
                              ) : isUpcoming ? (
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                              ) : null}
                              <span className="line-clamp-1">{cell.courseTitle}</span>
                            </p>
                            <p className="mt-0.5 line-clamp-2 font-semibold leading-snug text-ink-900">
                              {cell.title}
                            </p>
                            <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-ink-700">
                              <ClockIcon size={10} />
                              {timeFmt.format(new Date(cell.scheduledAt))}
                              {cell.durationMinutes
                                ? ` · ${cell.durationMinutes} min`
                                : ""}
                            </p>
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// kept for downstream consumers
export { ArrowRightIcon };
