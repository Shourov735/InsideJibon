"use client";

import { useEffect } from "react";

/**
 * R0 §4.1: keyboard navigation hook for the exam taker.
 *
 * ArrowLeft / ArrowRight move between questions; number keys 1..9 jump
 * directly to that question index. Activation is skipped while the
 * user is typing in a text field / contenteditable / radio group to
 * avoid stealing input.
 *
 * Returns nothing — wires via `window` listeners and unmount-cleans.
 */
export function useExamKeyboardNav(
  currentIndex: number,
  totalQuestions: number,
  setCurrentIndex: (next: number) => void
): void {
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      // Radiogroup focus should still allow arrow nav — only block when
      // a real text input is focused.
      return false;
    }

    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex(Math.max(0, currentIndex - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1));
      } else if (/^[1-9]$/.test(e.key)) {
        const target = Number(e.key) - 1;
        if (target < totalQuestions) {
          e.preventDefault();
          setCurrentIndex(target);
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, totalQuestions, setCurrentIndex]);
}
