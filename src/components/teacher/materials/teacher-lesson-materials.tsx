"use client";

import { useState } from "react";
import { MaterialUploadForm } from "./material-upload-form";
import { TeacherMaterialCard } from "./teacher-material-card";
import type { MaterialSummary } from "@/types/material";
import { useTranslations } from "@/i18n/client";

interface TeacherLessonMaterialsProps {
  courseId: string;
  lessonId: string;
  materials: MaterialSummary[];
  onMaterialsChange?: (updatedMaterials: MaterialSummary[]) => void;
}

export function TeacherLessonMaterials({
  courseId,
  lessonId,
  materials: initialMaterials,
  onMaterialsChange,
}: TeacherLessonMaterialsProps) {
  const { t, tn } = useTranslations();
  const [materials, setMaterials] = useState<MaterialSummary[]>(initialMaterials);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleUploadSuccess = (newMaterial: MaterialSummary) => {
    const updated = [...materials, newMaterial];
    setMaterials(updated);
    setIsUploading(false);
    setFeedback(t("teacher.materials.lessonList.uploadedFeedback", { name: newMaterial.name }));
    onMaterialsChange?.(updated);

    // Auto-clear feedback after 4 seconds
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleDeleted = (deletedId: string) => {
    const updated = materials.filter((m) => m.id !== deletedId);
    setMaterials(updated);
    setFeedback(t("teacher.materials.lessonList.deletedFeedback"));
    onMaterialsChange?.(updated);

    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleUpdated = (updatedMaterial: MaterialSummary) => {
    const updated = materials.map((m) =>
      m.id === updatedMaterial.id ? updatedMaterial : m
    );
    setMaterials(updated);
    setFeedback(t("teacher.materials.lessonList.updatedFeedback"));
    onMaterialsChange?.(updated);

    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-on-surface">
              {t("teacher.materials.lessonList.title")}
            </h4>
            <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[11px] font-semibold text-secondary">
              {tn("common.fileCountLower", materials.length)}
            </span>
          </div>
          <p className="text-xs text-secondary mt-0.5">
            {t("teacher.materials.lessonList.subtitle")}
          </p>
        </div>

        {!isUploading && (
          <button
            type="button"
            onClick={() => setIsUploading(true)}
            className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-lg border border-primary/40 bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-container hover:border-primary transition-colors shadow-2xs"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t("teacher.materials.lessonList.uploadFile")}</span>
          </button>
        )}
      </div>

      {/* Success Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-800 animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900"
            aria-label={t("teacher.materials.lessonList.dismissFeedback")}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Upload Form (when triggered) */}
      {isUploading && (
        <div className="animate-in fade-in zoom-in-95">
          <MaterialUploadForm
            lessonId={lessonId}
            courseId={courseId}
            onSuccess={handleUploadSuccess}
            onCancel={() => setIsUploading(false)}
          />
        </div>
      )}

      {/* Materials List or Empty State */}
      {materials.length === 0 && !isUploading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low/50 py-8 px-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-high text-secondary">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h5 className="mt-2.5 text-xs font-bold text-on-surface">{t("teacher.materials.lessonList.emptyTitle")}</h5>
          <p className="mt-1 max-w-sm text-[11px] text-secondary">
            {t("teacher.materials.lessonList.emptyDesc")}
          </p>
          <button
            type="button"
            onClick={() => setIsUploading(true)}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs font-medium text-primary hover:border-primary/50 hover:bg-surface-container transition-colors shadow-2xs"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t("teacher.materials.lessonList.uploadFirst")}</span>
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {materials.map((material) => (
            <TeacherMaterialCard
              key={material.id}
              material={material}
              courseId={courseId}
              onDeleted={handleDeleted}
              onUpdated={handleUpdated}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
