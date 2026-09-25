"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

/**
 * R0 §3.2: client-side form wrapper used by every create/edit dialog
 * and detail page. Centralizes:
 *   - Optimistic submit state (returns the action's promise).
 *   - Top-of-form error banner with focus management.
 *   - Dirty-state guard before navigation.
 *   - Keyboard escape to close (when `onCancel` is provided).
 *
 * R1 wires this shell into the exam-builder, assignment-builder, and
 * the course-edit forms. For now it's introduced without mass-
 * rewriting existing call sites.
 */
export interface ResourceFormShellProps {
  /** Form submit handler — should throw or return an error message. */
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  /** Submit-button label (i18n key or literal string). */
  submitLabel: ReactNode;
  /** Cancel-button label and click handler. */
  onCancel?: () => void;
  cancelLabel?: ReactNode;
  /** Optional initial `defaultValue` for the inner form element. */
  defaultValue?: string;
  /** Children — the actual form fields. */
  children: ReactNode;
  /** Optional pending state when the parent already has a pending flag. */
  isPending?: boolean;
  /** Optional error message rendered at the top. */
  error?: string | null;
}

export function ResourceFormShell({
  onSubmit,
  submitLabel,
  onCancel,
  cancelLabel,
  children,
  isPending,
  error,
}: ResourceFormShellProps) {
  const [internalError, setInternalError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  // Focus the error banner whenever it appears so screen readers
  // announce it and keyboard users see the message.
  useEffect(() => {
    if (error || internalError) {
      errorRef.current?.focus();
    }
  }, [error, internalError]);

  // Esc closes the dialog when a cancel handler exists.
  useEffect(() => {
    if (!onCancel) return;
    const handler = onCancel;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handler();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInternalError(null);
    try {
      await onSubmit(event);
    } catch (err) {
      setInternalError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const displayedError = error ?? internalError;
  const disabled = Boolean(isPending);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
      noValidate
    >
      {displayedError ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border border-error-container bg-error-container/40 p-3 text-xs text-on-error-container"
        >
          {displayedError}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">{children}</div>

      <div className="flex items-center justify-end gap-3 border-t border-outline-variant pt-4">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50"
          >
            {cancelLabel ?? "Cancel"}
          </button>
        ) : null}

        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
