"use client";

import { useTranslations } from "@/i18n/client";

interface ExamBuilderSettingsPanelProps {
  questionCount: number;
  totalMarks: number;
  durationMinutes: number | null | undefined;
}

/**
 * R0 §4.2: read-only summary panel rendered in the exam-builder
 * header. Future phases (R3+) will surface live settings editing here
 * — for now the parent owns the edit modal and the settings page.
 */
export function ExamBuilderSettingsPanel({
  questionCount,
  totalMarks,
  durationMinutes,
}: ExamBuilderSettingsPanelProps) {
  const { t, tn } = useTranslations();
  return (
    <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-secondary bg-surface-container-low px-3 py-1.5 rounded-lg">
      <span>{tn("common.questionCountUpper", questionCount)}</span>
      <span>•</span>
      <span>{t("student.exam.totalMarksLabel", { marks: totalMarks })}</span>
      {durationMinutes ? (
        <>
          <span>•</span>
          <span>{t("student.exam.durationShort", { minutes: durationMinutes })}</span>
        </>
      ) : null}
    </div>
  );
}
