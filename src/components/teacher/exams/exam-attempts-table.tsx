"use client";

import { useTranslations } from "@/i18n/client";

export interface TeacherExamAttemptSummary {
  id: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string;
  attemptNumber: number;
  status: "in_progress" | "submitted";
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  totalPoints: number | null;
}

interface ExamAttemptsTableProps {
  /** Reserved for the R3 attempt-detail deep-link. Currently unused but
   * part of the prop surface so callers don't need to change when the
   * wiring lands. */
  examId: string;
  attempts: TeacherExamAttemptSummary[];
  /** Fallback totalMarks when `attempt.totalPoints` is null. */
  totalMarks: number;
}

/**
 * R0 §4.4: teacher's per-attempt view. Lists every attempt for the exam
 * with status, score, and timing. Clicking a row jumps to the student's
 * attempt detail (route is wired later by the R3 attempts deep-dive).
 *
 * For now the component is a pure presentation layer — the parent page
 * fetches attempts via a teacher-side service once that exists.
 */
export function ExamAttemptsTable({
  examId,
  attempts,
  totalMarks,
}: ExamAttemptsTableProps) {
  const { t, locale } = useTranslations();

  if (attempts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center shadow-xs space-y-2">
        <h3 className="text-sm font-bold text-on-surface">
          {t("teacher.examDetail.noAttemptsTitle")}
        </h3>
        <p className="mx-auto max-w-sm text-xs text-secondary">
          {t("teacher.examDetail.noAttemptsDesc")}
        </p>
      </div>
    );
  }

  const formatDateTime = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(iso))
      : "—";

  // examId is part of the prop surface for the future deep-link wiring.
  void examId;

  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-wider text-secondary">
            <tr>
              <th className="px-5 py-3.5 font-semibold">
                {t("teacher.examDetail.thStudent")}
              </th>
              <th className="px-5 py-3.5 font-semibold">
                {t("teacher.examDetail.thAttempt")}
              </th>
              <th className="px-5 py-3.5 font-semibold">
                {t("teacher.examDetail.thStatus")}
              </th>
              <th className="px-5 py-3.5 font-semibold">
                {t("teacher.examDetail.thStartedAt")}
              </th>
              <th className="px-5 py-3.5 font-semibold">
                {t("teacher.examDetail.thSubmittedAt")}
              </th>
              <th className="px-5 py-3.5 text-right font-semibold">
                {t("teacher.examDetail.thScore")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {attempts.map((attempt) => (
              <tr
                key={attempt.id}
                className="hover:bg-surface-container-low/70 transition-colors"
              >
                <td className="px-5 py-4">
                  <span className="font-semibold text-on-surface block">
                    {attempt.studentName || "—"}
                  </span>
                  <span className="text-xs text-secondary font-mono">
                    {attempt.studentEmail}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-on-surface-variant font-medium">
                  #{attempt.attemptNumber}
                </td>
                <td className="px-5 py-4 text-xs">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      attempt.status === "submitted"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {attempt.status === "submitted"
                      ? t("teacher.examDetail.statusSubmitted")
                      : t("teacher.examDetail.statusInProgress")}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-on-surface-variant">
                  {formatDateTime(attempt.startedAt)}
                </td>
                <td className="px-5 py-4 text-xs text-on-surface-variant">
                  {formatDateTime(attempt.submittedAt)}
                </td>
                <td className="px-5 py-4 text-right text-xs font-bold">
                  {attempt.status === "submitted" && attempt.score !== null ? (
                    <span className="text-emerald-700">
                      {attempt.score} / {attempt.totalPoints ?? totalMarks}
                    </span>
                  ) : (
                    <span className="text-outline">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
