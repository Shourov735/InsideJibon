/**
 * ConfirmDialog — accessible modal confirmation.
 *
 * Replaces ad-hoc dialog implementations. Renders a centered
 * modal on all viewports with a backdrop. ESC + backdrop click
 * dismiss; primary action button auto-focuses.
 */

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  loading?: boolean;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  loading = false,
  children,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    confirmRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full max-w-md rounded-3xl border border-outline-variant bg-surface-0 p-5 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.18)]",
          "sm:p-6",
          "animate-[dialog-in_200ms_cubic-bezier(0.2,0,0,1)]",
        )}
      >
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-900">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm text-ink-500">{description}</p>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-outline-variant bg-surface-0 px-4 text-sm font-semibold text-ink-900 hover:bg-surface-1"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50",
              tone === "danger"
                ? "bg-[color:var(--color-danger)] hover:bg-[color:var(--color-danger)]/90"
                : "bg-primary text-on-primary hover:bg-primary/90",
            )}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes dialog-in {
          from {
            transform: translateY(8px) scale(0.98);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}
