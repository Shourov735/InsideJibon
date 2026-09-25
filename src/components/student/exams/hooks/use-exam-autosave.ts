"use client";

import { useEffect, useRef } from "react";

/**
 * R0 §4.1: autosave hook scaffold.
 *
 * Today the exam taker does not autosave selections server-side — R0
 * only extracts the seam so the eventual autosave wire-up (R9 / a
 * later phase) is mechanical. The hook:
 *  - Tracks the latest selection set via a ref so we don't trigger on
 *    identity changes.
 *  - Calls `onTick(selections)` at most once every `intervalMs`.
 *  - Cleans up on unmount.
 *
 * Callers pass a no-op or a real persistence function. Passing
 * `undefined` disables autosave entirely.
 */
export type AutosaveState<TRow> = {
  /** Last persisted value; `null` until the first tick fires. */
  lastSaved: ReadonlyArray<TRow> | null;
};

export function useExamAutosave<T>(
  serialize: () => T,
  persist: ((value: T) => Promise<void> | void) | undefined,
  intervalMs: number
): AutosaveState<T> {
  const lastSavedRef = useRef<T | null>(null);
  const lastFlushedRef = useRef<number>(0);
  const persistRef = useRef(persist);

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  useEffect(() => {
    if (!persistRef.current) return;
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastFlushedRef.current < intervalMs) return;
      const value = serialize();
      if (value === lastSavedRef.current) return;
      lastSavedRef.current = value;
      lastFlushedRef.current = now;
      void persistRef.current?.(value);
    }, Math.min(intervalMs, 5_000));

    return () => clearInterval(interval);
  }, [intervalMs, serialize]);

  return { lastSaved: null };
}
