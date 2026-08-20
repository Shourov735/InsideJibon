"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  archiveExamAction,
  deleteExamAction,
  publishExamAction,
  restoreExamAction,
  unpublishExamAction,
} from "@/app/teacher/exams/actions";
import type { ExamPublishCheck } from "@/types/exam";

interface ExamLifecycleActionsProps {
  examId: string;
  status: "draft" | "published" | "archived";
  publishCheck: ExamPublishCheck;
}

/**
 * Minimal lifecycle actions (publish / unpublish / archive / restore /
 * delete) used to verify the backend contract. Antigravity will replace
 * this with the Stitch UI.
 */
export function ExamLifecycleActions({
  examId,
  status,
  publishCheck,
}: ExamLifecycleActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (label: string, action: (id: string) => Promise<unknown>) => {
    setError(null);
    setBusy(label);
    try {
      const result = await action(examId);
      if (result && typeof result === "object" && !("success" in result)) {
        throw new Error("Unexpected response");
      }
      if (result && typeof result === "object" && "success" in result) {
        const r = result as { success: boolean; error?: string };
        if (!r.success) {
          setError(r.error ?? "Action failed.");
          return;
        }
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  };

  const buttonClass =
    "rounded-lg px-4 py-2 text-sm font-semibold shadow-xs transition-colors disabled:opacity-60";

  return (
    <div className="space-y-3">
      {error && (
        <div className="whitespace-pre-wrap rounded-lg border border-error-container bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {status === "draft" && (
          <button
            type="button"
            disabled={busy !== null || !publishCheck.canPublish}
            onClick={() => run("publish", publishExamAction)}
            className={`${buttonClass} bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container disabled:cursor-not-allowed disabled:opacity-50`}
            title={
              publishCheck.canPublish
                ? "Publish exam"
                : "Fix the issues below before publishing"
            }
          >
            {busy === "publish" ? "Publishing…" : "Publish Exam"}
          </button>
        )}

        {status === "published" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("unpublish", unpublishExamAction)}
            className={`${buttonClass} bg-surface-container-high text-on-surface hover:bg-surface-container-highest`}
          >
            {busy === "unpublish" ? "Unpublishing…" : "Unpublish"}
          </button>
        )}

        {(status === "draft" || status === "published") && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("archive", archiveExamAction)}
            className={`${buttonClass} border border-outline-variant text-on-surface-variant hover:bg-surface-container`}
          >
            {busy === "archive" ? "Archiving…" : "Archive"}
          </button>
        )}

        {status === "archived" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("restore", restoreExamAction)}
            className={`${buttonClass} border border-outline-variant text-on-surface-variant hover:bg-surface-container`}
          >
            {busy === "restore" ? "Restoring…" : "Restore to Draft"}
          </button>
        )}

        {status !== "published" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={async () => {
              if (!window.confirm("Delete this exam permanently? This cannot be undone.")) return;
              await run("delete", deleteExamAction);
              router.push("/teacher/exams");
            }}
            className={`${buttonClass} bg-error text-on-error hover:bg-error-container hover:text-on-error-container`}
          >
            {busy === "delete" ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>

      {status === "draft" && publishCheck.errors.length > 0 && (
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Publish checklist
          </p>
          <ul className="mt-2 space-y-1 text-sm text-on-surface-variant">
            {publishCheck.errors.map((err) => (
              <li key={err} className="flex items-start gap-2">
                <span className="mt-0.5 text-error">•</span>
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}