"use client";

import { useState } from "react";
import { FileTypeIcon } from "@/components/materials/file-type-icon";
import { formatBytes, getFileTypeCategory, getFileTypeLabel } from "@/lib/material-utils";
import { getSubmissionFileDownloadUrl } from "./file-type-helper";
import { useTranslations } from "@/i18n/client";
import type { AssignmentSubmissionFile } from "@/db/schema";

interface SubmissionFileItemProps {
  file: AssignmentSubmissionFile | {
    id: string;
    submissionId: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt?: Date | string;
  };
  canDelete?: boolean;
  onDelete?: (fileId: string) => Promise<void> | void;
}

export function SubmissionFileItem({
  file,
  canDelete = false,
  onDelete,
}: SubmissionFileItemProps) {
  const { t, locale } = useTranslations();
  const [isDeleting, setIsDeleting] = useState(false);

  const downloadUrl = getSubmissionFileDownloadUrl(file.submissionId, file.id);
  const category = getFileTypeCategory(file.mimeType, file.originalFilename);

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    const confirmed = window.confirm(
      t("student.assignmentWorkspace.deleteFileConfirm")
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await onDelete(file.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-3.5 transition-colors hover:border-primary/30">
      <div className="flex items-center gap-3 min-w-0">
        <FileTypeIcon
          mimeType={file.mimeType}
          filename={file.originalFilename}
          category={category}
          size="md"
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-on-surface" title={file.originalFilename}>
            {file.originalFilename}
          </p>
          <p className="text-[11px] text-secondary">
            {formatBytes(file.sizeBytes)} • {getFileTypeLabel(file.mimeType, file.originalFilename, locale)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={downloadUrl}
          download={file.originalFilename}
          className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-on-primary shadow-2xs"
          title={t("common.download")}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="hidden sm:inline">{t("common.download")}</span>
        </a>

        {canDelete && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-secondary hover:bg-error-container/40 hover:text-error transition-colors disabled:opacity-50"
            title={t("student.assignmentWorkspace.removeFile")}
          >
            {isDeleting ? (
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
            <span className="hidden sm:inline">{t("student.assignmentWorkspace.removeFile")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
