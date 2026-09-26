/**
 * ActionMenu — overflow menu (kebab) for tables / list rows.
 *
 * Use this anywhere we previously had a row of inline buttons
 * that overflowed on small screens. Renders a single "⋯" button
 * that opens a small popover.
 */

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export interface ActionMenuItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  /** Accessible label for the trigger button. */
  "aria-label"?: string;
  /** Optional className for the trigger button. */
  triggerClassName?: string;
}

export function ActionMenu({
  items,
  "aria-label": ariaLabel = "Open menu",
  triggerClassName,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 200;
    const left = Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth);
    setPosition({ top: rect.bottom + 6, left: Math.max(8, left) });
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-1 hover:text-ink-900",
          "focus-visible:outline-2 focus-visible:outline-[color:var(--color-info)] focus-visible:outline-offset-2",
          triggerClassName,
        )}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <circle cx="3" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="13" cy="8" r="1.5" fill="currentColor" />
        </svg>
      </button>
      {open && position && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: position.top, left: position.left }}
              className="fixed z-[55] min-w-[200px] rounded-xl border border-outline-variant bg-surface-0 p-1 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.18)]"
            >
              {items.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onSelect();
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    item.tone === "danger"
                      ? "text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger)]/10"
                      : "text-ink-900 hover:bg-surface-1",
                    item.disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  {item.icon ? <span aria-hidden className="text-ink-500">{item.icon}</span> : null}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
