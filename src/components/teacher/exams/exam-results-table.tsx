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
import { ResponsiveTable, type ResponsiveTableColumn } from "@/components/shared/ui/responsive-table";

export function ExamResultsTable({
  examId,
  rows,
  totalMarks,
  passPercentage = 50,
}: ExamResultsTableProps) {
  const { t, locale } = useTranslations();

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-outline-variant bg-surface-0 p-10 text-center shadow-xs space-y-2">
        <h3 className="text-sm font-bold text-ink-900">
          {t("teacher.examDetail.noResultsTitle")}
        </h3>
        <p className="mx-auto max-w-sm text-xs text-ink-500">
          {t("teacher.examDetail.noResultsDesc")}
        </p>
      </div>
    );
  }

  const sorted = [...rows].sort(
    (a, b) => b.bestPercentage - a.bestPercentage
  );

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

  const columns: ResponsiveTableColumn<TeacherExamResultRow>[] = [
    {
      header: t("teacher.examDetail.thRank"),
      className: "w-16 font-bold text-ink-500 text-xs",
      mobilePrimary: true,
      cell: (_row, idx) => (
        <span className="font-bold text-xs text-ink-500">#{idx + 1}</span>
      ),
    },
    {
      header: t("teacher.examDetail.thStudent"),
      mobilePrimary: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-ink-900 block text-sm">
            {row.studentName || "—"}
          </span>
          <span className="text-xs text-ink-500 font-mono">
            {row.studentEmail}
          </span>
        </div>
      ),
    },
    {
      header: t("teacher.examDetail.thScore"),
      mobileLabel: t("teacher.examDetail.thScore"),
      cell: (row) => {
        const passed = row.bestPercentage >= passPercentage;
        return (
          <span className={`font-bold text-xs ${passed ? "text-emerald-700" : "text-amber-700"}`}>
            {row.bestScore} / {row.totalPoints}
          </span>
        );
      },
    },
    {
      header: t("teacher.examDetail.thPercentage"),
      mobileLabel: t("teacher.examDetail.thPercentage"),
      cell: (row) => {
        const passed = row.bestPercentage >= passPercentage;
        return (
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              passed
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-amber-100 text-amber-800 border border-amber-300"
            }`}
          >
            {row.bestPercentage.toFixed(1)}%
          </span>
        );
      },
    },
    {
      header: t("teacher.examDetail.thAttempts"),
      mobileLabel: t("teacher.examDetail.thAttempts"),
      cell: (row) => (
        <span className="text-xs text-ink-500 font-medium">
          {row.attemptCount} (best #{row.bestAttempt})
        </span>
      ),
    },
    {
      header: t("teacher.examDetail.thLastSubmitted"),
      mobileLabel: t("teacher.examDetail.thLastSubmitted"),
      cell: (row) => (
        <span className="text-xs text-ink-500">
          {formatDateTime(row.lastSubmittedAt)}
        </span>
      ),
    },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      rows={sorted}
      rowKey={(r) => r.studentId}
      mobileLeading={(row) => {
        const rank = sorted.indexOf(row) + 1;
        return (
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs font-bold text-ink-700">
              #{rank}
            </span>
            <div className="min-w-0">
              <span className="font-semibold text-ink-900 block text-sm truncate">
                {row.studentName || "—"}
              </span>
              <span className="text-xs text-ink-500 font-mono truncate block">
                {row.studentEmail}
              </span>
            </div>
          </div>
        );
      }}
      mobileTrailing={(row) => {
        const passed = row.bestPercentage >= passPercentage;
        return (
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              passed
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-amber-100 text-amber-800 border border-amber-300"
            }`}
          >
            {row.bestPercentage.toFixed(1)}%
          </span>
        );
      }}
    />
  );
}
