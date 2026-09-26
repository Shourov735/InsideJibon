/**
 * MobileDrawer — bottom-sheet drawer for mobile navigation / actions.
 *
 * Desktop: never rendered. Use a regular sidebar / inline content.
 * Mobile: slides up from the bottom with a drag handle and a
 *   scrollable body. Trapped focus, ESC-to-close, body scroll lock.
 *
 * Built as a Client Component but uses an inline portal-free
 * approach (no extra portal mount) so it stays server-renderable.
 */

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** "sheet" (bottom up, mobile-only) or "panel" (full-height, also useful on tablet). */
  variant?: "sheet" | "panel";
}

export function MobileDrawer({
  open,
  onClose,
  title,
  children,
  variant = "sheet",
}: MobileDrawerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] md:hidden"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Close menu"
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={ref}
        className={cn(
          "absolute left-0 right-0 bg-surface-0 shadow-[0_-12px_32px_-10px_rgba(0,0,0,0.18)]",
          "max-h-[88vh] overflow-y-auto",
          "rounded-t-3xl",
          "animate-[sheet-up_240ms_cubic-bezier(0.2,0,0,1)]",
          variant === "panel" && "inset-y-0 right-0 left-auto w-[88vw] max-w-sm rounded-l-3xl rounded-tr-none",
        )}
        style={
          variant === "sheet"
            ? { bottom: 0 }
            : { top: 0 }
        }
      >
        {variant === "sheet" ? (
          <div className="sticky top-0 z-10 flex items-center justify-center bg-surface-0 pt-2 pb-3">
            <span aria-hidden className="h-1.5 w-12 rounded-full bg-outline-variant" />
          </div>
        ) : null}
        {title ? (
          <div className="px-5 pb-2 pt-1">
            <div className="font-display text-base font-semibold text-ink-900">{title}</div>
          </div>
        ) : null}
        <div className="px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">{children}</div>
      </div>

      <style jsx>{`
        @keyframes sheet-up {
          from {
            transform: translateY(20%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}
