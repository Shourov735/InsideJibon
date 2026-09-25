"use client";

import { useState, useTransition } from "react";

interface StreakRepairModalProps {
  freezesAvailable: number;
  /** Server action that returns whether the repair succeeded. */
  onRepair: () => Promise<{ success: boolean; error?: string }>;
  trigger?: React.ReactNode;
}

/**
 * R5 §4.2 — Streak-repair modal.
 *
 * Shows when the streak service reports `broken: true` AND the user
 * still has freezes. Confirms the freeze consumption, calls the
 * server action, and refreshes the page on success.
 */
export function StreakRepairModal({
  freezesAvailable,
  onRepair,
  trigger,
}: StreakRepairModalProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRepair = () => {
    setError(null);
    startTransition(async () => {
      const result = await onRepair();
      if (result.success) {
        setOpen(false);
        // Parent route should call router.refresh() in the action.
      } else {
        setError(result.error ?? "Repair failed. Try again.");
      }
    });
  };

  if (freezesAvailable <= 0) {
    return trigger ? <>{trigger}</> : null;
  }

  return (
    <>
      {trigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary shadow-2xs hover:bg-primary-container hover:text-on-primary-container transition-colors"
        >
          {trigger}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary shadow-2xs hover:bg-primary-container hover:text-on-primary-container transition-colors"
        >
          Repair streak
        </button>
      )}

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="streak-repair-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/40 p-4"
          onClick={() => !isPending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-0 p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="streak-repair-title"
              className="font-display text-lg font-bold tracking-tight text-on-surface"
            >
              You missed a day — repair your streak?
            </h2>
            <p className="mt-2 text-sm text-secondary">
              Use one streak freeze to keep your streak alive. You have{" "}
              <span className="font-semibold text-on-surface">
                {freezesAvailable}
              </span>{" "}
              freeze{freezesAvailable === 1 ? "" : "s"} left this week.
            </p>
            {error ? (
              <p className="mt-3 rounded-lg bg-error-container/30 px-3 py-2 text-xs font-medium text-error">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded-lg border border-outline-variant bg-surface-0 px-4 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-60"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleRepair}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-2xs hover:bg-primary-container hover:text-on-primary-container disabled:opacity-60"
              >
                {isPending ? "Repairing…" : "Use 1 freeze"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}