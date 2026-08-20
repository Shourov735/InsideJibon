"use client";

import { useState } from "react";
import { FileTypeIcon } from "@/components/materials/file-type-icon";
import {
  deleteMaterialAction,
  updateMaterialAction,
} from "@/app/teacher/courses/actions";
import {
  formatBytes,
  formatMaterialDate,
  getFileTypeLabel,
  getMaterialDownloadUrl,
} from "@/lib/material-utils";
import { MAX_MATERIAL_NAME_LENGTH } from "@/schemas/material";
import type { MaterialSummary } from "@/types/material";

interface TeacherMaterialCardProps {
  material: MaterialSummary;
  courseId?: string;
  onDeleted: (materialId: string) => void;
  onUpdated: (material: MaterialSummary) => void;
}

export function TeacherMaterialCard({
  material,
  courseId,
  onDeleted,
  onUpdated,
}: TeacherMaterialCardProps) {
  // Rename state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(material.name);
  const [isSavingName, setIsSavingName] = useState(false);

  // Delete modal state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const downloadUrl = getMaterialDownloadUrl(material.id);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || editName.trim() === material.name) {
      setIsEditing(false);
      return;
    }

    setIsSavingName(true);
    setErrorMessage(null);

    try {
      const result = await updateMaterialAction(
        {
          materialId: material.id,
          name: editName.trim(),
        },
        courseId
      );

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setIsEditing(false);
      onUpdated(result.data);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update material name."
      );
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const result = await deleteMaterialAction(
        { materialId: material.id },
        courseId
      );

      if (!result.success) {
        setErrorMessage(result.error);
        setIsDeleting(false);
        setIsConfirmingDelete(false);
        return;
      }

      setIsConfirmingDelete(false);
      onDeleted(material.id);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to delete material."
      );
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  return (
    <li className="relative rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 transition-all hover:border-primary/30 hover:shadow-2xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Icon and Details */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <FileTypeIcon
            mimeType={material.mimeType}
            filename={material.originalFilename}
            size="md"
            className="mt-0.5"
          />

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={MAX_MATERIAL_NAME_LENGTH}
                  autoFocus
                  required
                  disabled={isSavingName}
                  className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={isSavingName || !editName.trim()}
                  className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-on-primary hover:bg-primary-container disabled:opacity-50"
                >
                  {isSavingName ? "..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditName(material.name);
                    setIsEditing(false);
                    setErrorMessage(null);
                  }}
                  disabled={isSavingName}
                  className="rounded-md px-2 py-1 text-xs text-secondary hover:bg-surface-container"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h5 className="truncate text-xs font-bold text-on-surface">
                  {material.name}
                </h5>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded p-1 text-outline hover:bg-surface-container-low hover:text-primary transition-colors"
                  title="Rename resource"
                  aria-label={`Rename ${material.name}`}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              </div>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-secondary">
              <span>{formatBytes(material.sizeBytes)}</span>
              <span>•</span>
              <span>{getFileTypeLabel(material.mimeType, material.originalFilename)}</span>
              {material.originalFilename !== material.name && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[200px]" title={material.originalFilename}>
                    {material.originalFilename}
                  </span>
                </>
              )}
              {material.createdAt && (
                <>
                  <span>•</span>
                  <span>{formatMaterialDate(material.createdAt)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <a
            href={downloadUrl}
            download={material.originalFilename}
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-medium text-secondary hover:bg-surface-container hover:text-primary transition-colors"
            title={`Download ${material.originalFilename}`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Download</span>
          </a>

          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            disabled={isDeleting}
            className="inline-flex items-center gap-1 rounded-lg border border-error/20 bg-error-container/20 px-2.5 py-1.5 text-xs font-medium text-error hover:bg-error-container/40 transition-colors disabled:opacity-50"
            title={`Delete ${material.name}`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div
          role="alert"
          className="mt-2 rounded-lg border border-error/30 bg-error-container/30 p-2.5 text-xs text-on-error-container"
        >
          {errorMessage}
        </div>
      )}

      {/* Deletion Confirmation Modal / Dialog */}
      {isConfirmingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-title-${material.id}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error-container text-error">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h4 id={`delete-title-${material.id}`} className="text-sm font-bold text-on-surface">
                  Delete Material
                </h4>
                <p className="text-xs text-secondary">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to delete <strong className="text-on-surface font-semibold">{material.name}</strong>? This will permanently remove this resource from secure cloud storage and enrolled students will no longer have access.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
                className="rounded-lg border border-outline-variant px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-error px-4 py-2 text-xs font-semibold text-on-error shadow-xs transition-colors hover:bg-error/90 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Permanently Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
