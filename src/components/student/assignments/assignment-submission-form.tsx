"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  uploadSubmissionFileAction,
  deleteSubmissionFileAction,
  submitAssignmentAction,
} from "@/app/student/actions/assignment-actions";
import {
  formatBytes,
  getAllowedTypesSummary,
  getAcceptStringFromMimeTypes,
} from "@/components/assignments/file-type-helper";
import type { Assignment } from "@/db/schema";
import type { SubmissionFileSummary } from "@/services/assignments";
import { useTranslations } from "@/i18n/client";

import { AssignmentFileList } from "./assignment-file-list";

interface AssignmentSubmissionFormProps {
  assignment: Assignment;
  files: SubmissionFileSummary[];
  isLateSubmission: boolean;
  canModifyFiles: boolean;
  isSubmitted: boolean;
  onError: (message: string | null) => void;
}

/**
 * R0 §4.5: student-facing submission workspace. Owns:
 *   - upload dropzone + click-to-upload
 *   - file delete + list (delegated to <AssignmentFileList />)
 *   - submit action + confirmation modal
 *
 * Error reporting is lifted via `onError` so the orchestrator can show
 * the banner at the top of the page. Upload/refresh is done by calling
 * `router.refresh()` after each successful mutation.
 */
export function AssignmentSubmissionForm({
  assignment,
  files,
  isLateSubmission,
  canModifyFiles,
  isSubmitted,
  onError,
}: AssignmentSubmissionFormProps) {
  const router = useRouter();
  const { t, locale } = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  async function handleFileUpload(file: File) {
    onError(null);

    if (file.size > assignment.maxFileSize) {
      onError(
        t("errors.assignmentFileTooLarge") + ` (${formatBytes(assignment.maxFileSize)})`
      );
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("assignmentId", assignment.id);
      formData.append("file", file);

      const res = await uploadSubmissionFileAction(formData);
      if (!res.success) {
        onError(res.error);
        return;
      }

      router.refresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : t("errors.uploadFailed"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      void handleFileUpload(fileList[0]);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (!canModifyFiles || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFileUpload(e.dataTransfer.files[0]);
    }
  }

  async function handleDeleteFile(fileId: string) {
    onError(null);
    try {
      const res = await deleteSubmissionFileAction({ fileId });
      if (!res.success) {
        onError(res.error);
        return;
      }
      router.refresh();
    } catch (err) {
      onError(
        err instanceof Error ? err.message : t("teacher.assignmentDetail.failedAction")
      );
    }
  }

  async function handleConfirmSubmit() {
    setIsSubmitting(true);
    onError(null);

    try {
      const res = await submitAssignmentAction({ assignmentId: assignment.id });
      if (!res.success) {
        onError(res.error);
        return;
      }

      setIsConfirmModalOpen(false);
      router.refresh();
    } catch (err) {
      onError(
        err instanceof Error ? err.message : t("teacher.assignmentDetail.failedAction")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const acceptString = getAcceptStringFromMimeTypes(
    assignment.allowedFileTypes ?? undefined
  );

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-base font-bold text-on-surface">
            {t("student.assignmentWorkspace.yourSubmission")}
          </h2>
          <p className="text-xs text-secondary mt-0.5">
            {t("student.assignmentWorkspace.uploadSubtitle")}
          </p>
        </div>
      </div>

      {canModifyFiles ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-outline-variant bg-surface-container-low hover:border-primary/50 hover:bg-surface-container"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptString}
            onChange={handleFileInputChange}
            disabled={isUploading}
            className="hidden"
          />

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {isUploading ? (
              <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
        className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            )}
          </div>

          <p className="mt-3 text-xs font-bold text-on-surface">
            {isUploading
              ? t("student.assignmentWorkspace.uploading")
              : t("student.assignmentWorkspace.dropzoneText")}
          </p>
          <p className="mt-1 text-[11px] text-secondary">
            {getAllowedTypesSummary(assignment.allowedFileTypes, locale)} (Max{" "}
            {formatBytes(assignment.maxFileSize)})
          </p>
        </div>
      ) : null}

      <AssignmentFileList
        files={files}
        canDelete={canModifyFiles}
        onDelete={handleDeleteFile}
      />

      {canModifyFiles && files.length > 0 ? (
        <div className="flex items-center justify-end border-t border-outline-variant pt-4">
          <button
            type="button"
            onClick={() => setIsConfirmModalOpen(true)}
            disabled={isSubmitting || isUploading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50 transition-colors"
          >
            <svg
        className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>
              {isSubmitted
                ? t("student.assignmentWorkspace.resubmitBtn")
                : t("student.assignmentWorkspace.submitBtn")}
            </span>
          </button>
        </div>
      ) : null}

      {isConfirmModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <svg
        className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3
                  id="confirm-modal-title"
                  className="text-base font-bold text-on-surface"
                >
                  {t("student.assignmentWorkspace.confirmModalTitle")}
                </h3>
                <p className="mt-1 text-xs text-secondary leading-relaxed">
                  {t("student.assignmentWorkspace.confirmModalDesc")}
                </p>
              </div>
            </div>

            {isLateSubmission ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                {t("student.assignmentWorkspace.confirmModalLateNotice")}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                {t("student.assignmentWorkspace.cancelModalBtn")}
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-container disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <svg
        className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>{t("student.assignmentWorkspace.submitting")}</span>
                  </>
                ) : (
                  <span>{t("student.assignmentWorkspace.confirmSubmitBtn")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
