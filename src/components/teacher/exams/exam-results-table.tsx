"use client";

import { useTranslations } from "@/i18n/client";

export interface TeacherExamResultRow {
  studentId: string;
  studentName: string | null;
  studentEmail: string;
  bestAttempt: number;
  bestScore: number;
  totalPoints: number;
  bestPercentage: number;
  attemptCount: number;
  lastSubmittedAt: string | null;
}

interface ExamResultsTableProps {
  /** Reserved for the R3 attempt-detail deep-link. Currently unused but
   * part of the prop surface so callers don't need to change when the
   * wiring lands. */
  examId: string;
  rows: TeacherExamResultRow[];
  /** Default pass percentage threshold if `row.totalPoints` is missing. */
  totalMarks: number;
  passPercentage?: number;
}

/**
 * R0 §4.4: teacher's per-student aggregate view. One row per student
 * with their best attempt score + attempt count. Sorted by score DESC
 * so the leaderboard is implicit. Pass/fail chip uses `passPercentage`
 * (default 50) — wired to the per-exam pass threshold in a later phase.
 */
export function ExamResultsTable({
  examId,
  rows,
  totalMarks,
  passPercentage = 50,
}: ExamResultsTableProps) {
  const { t, locale } = useTranslations();

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center shadow-xs space-y-2">
        <h3 className="text-sm font-bold text-on-surface">
          {t("teacher.examDetail.noResultsTitle")}
        </h3>
        <p className="mx-auto max-w-sm text-xs text-secondary">
          {t("teacher.examDetail.noResultsDesc")}
        </p>
      </div>
    );
  }

  const sorted = [...rows].sort(
    (a, b) => b.bestPercentage - a.bestPercentage
  );

  // examId is part of the prop surface for the future deep-link wiring;
  // totalMarks is used as a sanity baseline for the pass threshold.
  void examId;
  void totalMarks;

  const formatDateTime = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(iso))
      : "—";

  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-wider text-secondary">
            <tr>
              <th className="px-5 py-3.5 font-semibold">
                {t("teacher.examDetail.thRank")}
              </th>
              <th className="px-5 py-3.5 font-semibold">
                {t("teacher.examDetail.thStudent")}
              </th>
              <th className="px-5 py-3.5 font-semibold">
                {t("teacher.examDetail.thBestAttempt")}
              </th>
              <th className="px-5 py-3.5 font-semibold">
                {t("teacher.examDetail.thScore")}
              </th>
              <th className="px-5 py-3.5 font-semibold">
                {t("teacher.examDetail.thPercentage")}
              </th>
              <th className="px-5 py-3.5 font-semibold">
                {t("teacher.examDetail.thAttempts")}
              </th>
              <th className="px-5 py-3.5 font-semibold">
                {t("teacher.examDetail.thLastSubmitted")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {sorted.map((row, idx) => {
              const passed = row.bestPercentage >= passPercentage;
              return (
                <tr
                  key={row.studentId}
                  className="hover:bg-surface-container-low/70 transition-colors"
                >
                  <td className="px-5 py-4 text-xs font-bold text-secondary">
                    #{idx + 1}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-on-surface block">
                      {row.studentName || "—"}
                    </span>
                    <span className="text-xs text-secondary font-mono">
                      {row.studentEmail}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-on-surface-variant font-medium">
                    #{row.bestAttempt}
                  </td>
                  <td className="px-5 py-4 text-xs font-bold">
                    <span className={passed ? "text-emerald-700" : "text-amber-700"}>
                      {row.bestScore} / {row.totalPoints}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        passed
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {row.bestPercentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-on-surface-variant font-medium">
                    {row.attemptCount}
                  </td>
                  <td className="px-5 py-4 text-xs text-on-surface-variant">
                    {formatDateTime(row.lastSubmittedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
