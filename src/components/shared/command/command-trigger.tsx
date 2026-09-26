"use client";

import { useTranslations } from "@/i18n/client";

/**
 * R1 §4 — Visual trigger button for the ⌘K command palette.
 *
 * Listens to the global keyboard shortcut itself (so the button
 * doesn't need to be focused). Renders as a small pill that hints
 * "⌘K" and "Search…" so it doubles as discoverability.
 */

export interface CommandTriggerProps {
  className?: string;
  compact?: boolean;
}

export function CommandTrigger({ className, compact = false }: CommandTriggerProps) {
  const { t } = useTranslations();

  function open() {
    window.dispatchEvent(new CustomEvent("ij:open-command"));
  }

  return (
    <button
      type="button"
      onClick={open}
      className={
        "inline-flex h-9 items-center gap-2 rounded-full border border-outline-variant bg-surface-0 px-2.5 text-xs text-ink-700 transition-colors hover:bg-surface-1 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-[color:var(--color-info)] focus-visible:outline-offset-2 " +
        (className ?? "")
      }
      aria-label={t("command.title")}
      title={t("command.title")}
    >
      <svg
        className="h-3.5 w-3.5 shrink-0 text-ink-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
      {!compact && (
        <span className="hidden xl:inline text-xs text-ink-500 font-medium">
          {t("common.search") || "Search…"}
        </span>
      )}
      <kbd className="hidden sm:inline-flex items-center rounded border border-outline-variant bg-surface-1 px-1.5 py-0.5 font-mono text-[10px] text-ink-500">
        ⌘K
      </kbd>
    </button>
  );
}
