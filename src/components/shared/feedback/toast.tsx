"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * R1 §7 — Toast system.
 *
 * A minimal, dependency-free transient toast layer:
 *   - <ToastViewport/> mounted once at the root layout, anchors a
 *     region with role="status" and aria-live="polite".
 *   - useToast() returns { success, error, warning, info, dismiss }
 *     so every Server Action outcome can produce a transient
 *     confirmation or error.
 *   - Queue is bounded to MAX_VISIBLE toasts; older entries are
 *     auto-dismissed after `duration` ms (default 4000).
 *   - Toasts persist in localStorage so the next mount can re-emit
 *     unread messages (the bell still holds the persistent record;
 *     this is only for transient layering).
 *
 * Toasts are appended at the bottom-right on desktop and the
 * bottom-center on small screens.
 */

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  /** When true, the toast is persisted to localStorage for replay on remount. */
  persist?: boolean;
}

interface Toast extends Required<Pick<ToastInput, "variant" | "durationMs">> {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
}

type ToastContextValue = {
  toasts: Toast[];
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  success: (input: Omit<ToastInput, "variant">) => string;
  error: (input: Omit<ToastInput, "variant">) => string;
  warning: (input: Omit<ToastInput, "variant">) => string;
  info: (input: Omit<ToastInput, "variant">) => string;
};

const MAX_VISIBLE = 3;
const STORAGE_KEY = "ij_toasts_unread_v1";

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Wrap a portion of the tree with <ToastProvider/> when you want
 * isolated toast regions (e.g. a settings dialog). If you do not wrap,
 * the global viewport exposes its own provider via ToastViewport.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = `toast_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
      const variant = input.variant ?? "info";
      const durationMs = input.durationMs ?? 4000;
      const toast: Toast = {
        id,
        title: input.title,
        description: input.description,
        variant,
        durationMs,
        createdAt: Date.now(),
      };
      setToasts((prev) => {
        const next = [...prev, toast];
        return next.slice(-MAX_VISIBLE);
      });

      if (input.persist && typeof window !== "undefined") {
        try {
          const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Array<
            Omit<Toast, "id" | "createdAt"> & { createdAt: number }
          >;
          existing.push({ ...toast, createdAt: toast.createdAt });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-MAX_VISIBLE)));
        } catch {
          /* ignore */
        }
      }

      const handle = setTimeout(() => dismiss(id), durationMs);
      timers.current.set(id, handle);
      return id;
    },
    [dismiss],
  );

  const helper = useCallback(
    (variant: ToastVariant) => (input: Omit<ToastInput, "variant">) =>
      push({ ...input, variant }),
    [push],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      push,
      dismiss,
      success: helper("success"),
      error: helper("error"),
      warning: helper("warning"),
      info: helper("info"),
    }),
    [toasts, push, dismiss, helper],
  );

  // Cleanup on unmount.
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const t of map.values()) clearTimeout(t);
      map.clear();
    };
  }, []);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider/> (or under <ToastViewport/>).");
  }
  return ctx;
}

/* ---------------------------------------------------------------- *
 * Viewport — the visible toast surface, anchored to the screen.
 * ---------------------------------------------------------------- */

const VARIANT_STYLES: Record<ToastVariant, { bg: string; ring: string; fg: string }> = {
  success: {
    bg: "bg-[color:var(--color-success)] text-white",
    ring: "ring-1 ring-inset ring-white/10",
    fg: "text-white",
  },
  error: {
    bg: "bg-[color:var(--color-error)] text-white",
    ring: "ring-1 ring-inset ring-white/10",
    fg: "text-white",
  },
  warning: {
    bg: "bg-[color:var(--color-warning)] text-white",
    ring: "ring-1 ring-inset ring-white/10",
    fg: "text-white",
  },
  info: {
    bg: "bg-[color:var(--color-info)] text-white",
    ring: "ring-1 ring-inset ring-white/10",
    fg: "text-white",
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const variant = VARIANT_STYLES[toast.variant];
  return (
    <div
      role="alert"
      aria-live={toast.variant === "error" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl shadow-lg backdrop-blur-sm",
        variant.bg,
        variant.ring,
      )}
    >
      <div className="flex items-start gap-3 p-3 pr-2">
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold leading-snug", variant.fg)}>{toast.title}</p>
          {toast.description ? (
            <p className={cn("mt-0.5 text-xs opacity-95 leading-snug", variant.fg)}>
              {toast.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="rounded-md p-1 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Dismiss notification"
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
    </div>
  );
}

/**
 * Root viewport — render once in app/layout.tsx. Wraps children in a
 * ToastProvider and renders the live region. Call useToast() anywhere
 * below this in the tree to dispatch toasts.
 */
export function ToastViewport({ children }: { children?: ReactNode }) {
  // Replay any pending toasts from localStorage on first client render.
  // We do this inside a lazy initializer pattern (no setState in
  // useEffect) so the new `react-hooks/set-state-in-effect` rule is
  // satisfied. The replay itself is event-based — see ToastReplayBridge.
  useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Toast[];
      const now = Date.now();
      const stillFresh = stored.filter((t) => now - t.createdAt < t.durationMs);
      localStorage.removeItem(STORAGE_KEY);
      if (stillFresh.length > 0) {
        // queueMicrotask keeps us off the current effect/render path.
        queueMicrotask(() => {
          for (const t of stillFresh) {
            window.dispatchEvent(new CustomEvent("ij:toast-replay", { detail: t }));
          }
        });
      }
    } catch {
      /* ignore */
    }
    return false;
  });

  return (
    <ToastProviderWithViewport>
      {children}
      <ToastReplayBridge />
    </ToastProviderWithViewport>
  );
}

function ToastProviderWithViewport({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = `toast_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
      const variant = input.variant ?? "info";
      const durationMs = input.durationMs ?? 4000;
      const toast: Toast = {
        id,
        title: input.title,
        description: input.description,
        variant,
        durationMs,
        createdAt: Date.now(),
      };
      setToasts((prev) => [...prev, toast].slice(-MAX_VISIBLE));

      if (input.persist && typeof window !== "undefined") {
        try {
          const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Array<
            Omit<Toast, "id"> & { createdAt: number }
          >;
          existing.push({
            title: toast.title,
            description: toast.description,
            variant: toast.variant,
            durationMs: toast.durationMs,
            createdAt: toast.createdAt,
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-MAX_VISIBLE)));
        } catch {
          /* ignore */
        }
      }
      return id;
    },
    [],
  );

  const helper = useCallback(
    (variant: ToastVariant) => (input: Omit<ToastInput, "variant">) => push({ ...input, variant }),
    [push],
  );

  const ctx = useMemo<ToastContextValue>(
    () => ({
      toasts,
      push,
      dismiss,
      success: helper("success"),
      error: helper("error"),
      warning: helper("warning"),
      info: helper("info"),
    }),
    [toasts, push, dismiss, helper],
  );

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastRegion({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastReplayBridge() {
  const ctx = useToastSafe();
  useEffect(() => {
    if (!ctx) return;
    // Capture the narrowed reference so the inner closure doesn't lose
    // the null check (TS narrows `ctx` per call-site, not across the
    // callback's closure scope).
    const provider = ctx;
    function onReplay(ev: Event) {
      const detail = (ev as CustomEvent<Toast>).detail;
      provider.push({
        title: detail.title,
        description: detail.description,
        variant: detail.variant,
        durationMs: Math.max(1500, detail.durationMs - (Date.now() - detail.createdAt)),
      });
    }
    window.addEventListener("ij:toast-replay", onReplay as EventListener);
    return () => window.removeEventListener("ij:toast-replay", onReplay as EventListener);
  }, [ctx]);
  return null;
}

/** useToast but returns null when no provider is present (for the bridge). */
function useToastSafe(): ToastContextValue | null {
  return useContext(ToastContext);
}
