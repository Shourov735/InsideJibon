"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * R0 §4.1: timer hook extracted from `exam-taker.tsx`. Tracks seconds
 * remaining from `startedAt + durationMinutes`, with low-time and
 * urgent-time thresholds used by the controls palette. The hook is
 * purely functional — no DOM, no translations, no router.
 *
 * The hook returns `null` for `secondsRemaining` when the exam is
 * untimed; callers should treat null as "no timer".
 */
export type ExamTimerState = {
  secondsRemaining: number | null;
  formattedTime: string | null;
  isLowTime: boolean;
  isUrgentTime: boolean;
};

export function useExamTimer(
  durationMinutes: number | null | undefined,
  startedAt: string | null | undefined
): ExamTimerState {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(() => {
    if (durationMinutes && startedAt) {
      const endMs = new Date(startedAt).getTime() + durationMinutes * 60 * 1000;
      const nowMs = Date.now();
      return Math.max(0, Math.floor((endMs - nowMs) / 1000));
    }
    return null;
  });

  useEffect(() => {
    if (durationMinutes && startedAt) {
      const endMs = new Date(startedAt).getTime() + durationMinutes * 60 * 1000;
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
        setSecondsRemaining(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [durationMinutes, startedAt]);

  const formattedTime = useMemo(() => {
    if (secondsRemaining == null) return null;
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }, [secondsRemaining]);

  const isLowTime = secondsRemaining != null && secondsRemaining <= 900; // < 15 mins
  const isUrgentTime = secondsRemaining != null && secondsRemaining <= 300; // < 5 mins

  return { secondsRemaining, formattedTime, isLowTime, isUrgentTime };
}
