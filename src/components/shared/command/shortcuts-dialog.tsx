"use client";

import { useEffect, useState } from "react";

import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * R1 §4 — `?` opens the keyboard shortcuts dialog.
 *
 * Listens for the `ij:shortcuts-open` window event (dispatched by the
 * command palette's footer link) and for the `?` key outside input
 * fields. Renders a small modal listing every shortcut.
 */

const SHORTCUTS: Array<{ keys: string[]; key: string }> = [
  { keys: ["⌘", "K"], key: "shortcuts.commandPalette" },
  { keys: ["?"], key: "shortcuts.showShortcuts" },
  { keys: ["Esc"], key: "shortcuts.close" },
  { keys: ["/"], key: "shortcuts.focusSearch" },
];

export function ShortcutsDialog() {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "?" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("ij:shortcuts-open", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ij:shortcuts-open", onOpen as EventListener);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("shortcuts.title")}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className={cn(
          "w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-outline-variant bg-surface-0 p-6 shadow-xl",
          "animate-in fade-in zoom-in-95 duration-150",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-on-surface">
            {t("shortcuts.title")}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("shortcuts.close")}
            className="rounded-md p-1 text-secondary hover:bg-surface-container hover:text-on-surface"
          >
            <svg
        className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <dl className="flex flex-col divide-y divide-outline-variant">
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <dt className="text-secondary">{t(s.key as "shortcuts.title")}</dt>
              <dd className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="rounded border border-outline-variant bg-surface-container-low px-1.5 py-0.5 font-mono text-[10px] text-on-surface"
                  >
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-secondary">
          {t("shortcuts.footer")}
        </p>
      </div>
    </div>
  );
}
