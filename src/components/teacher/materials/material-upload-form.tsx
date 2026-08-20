"use client";

import { useState, useRef, useId } from "react";
import { uploadMaterialAction } from "@/app/teacher/courses/actions";
import { FileTypeIcon } from "@/components/materials/file-type-icon";
import {
  formatBytes,
  getFileTypeCategory,
  getFileTypeLabel,
} from "@/lib/material-utils";
import { MAX_MATERIAL_SIZE_BYTES, MAX_MATERIAL_NAME_LENGTH } from "@/schemas/material";
import type { MaterialSummary } from "@/types/material";

const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".zip",
  ".txt",
].join(",");

interface MaterialUploadFormProps {
  lessonId: string;
  courseId?: string;
  onSuccess: (material: MaterialSummary) => void;
  onCancel?: () => void;
}

export function MaterialUploadForm({
  lessonId,
  courseId,
  onSuccess,
  onCancel,
}: MaterialUploadFormProps) {
  const fileInputId = useId();
  const nameInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setErrorMessage(null);

    // Client-side quick checks for instant user feedback
    if (selectedFile.size > MAX_MATERIAL_SIZE_BYTES) {
      setErrorMessage("This file is too large. The maximum upload size is 25 MB.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    // Pre-populate display name from filename without extension if empty
    const dot = selectedFile.name.lastIndexOf(".");
    const stem = dot > 0 ? selectedFile.name.slice(0, dot) : selectedFile.name;
    setDisplayName(stem.slice(0, MAX_MATERIAL_NAME_LENGTH));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileSelect(droppedFile);
    }
  };

  const handleClear = () => {
    setFile(null);
    setDisplayName("");
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("lessonId", lessonId);
      if (displayName.trim()) {
        formData.append("name", displayName.trim());
      }

      const result = await uploadMaterialAction(formData, courseId);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      // Success
      handleClear();
      onSuccess(result.data);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to upload material. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs space-y-4"
    >
      <div className="flex items-center justify-between border-b border-outline-variant pb-3">
        <div>
          <h4 className="text-sm font-bold text-on-surface">Upload Lesson Material</h4>
          <p className="text-xs text-secondary mt-0.5">
            Attach study notes, slides, worksheets, or reference files for enrolled students.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="rounded-lg p-1 text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
            aria-label="Close upload form"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-error/30 bg-error-container/40 p-3 text-xs font-medium text-on-error-container"
        >
          <svg
            className="h-4 w-4 text-error shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* File Dropzone / Selected File Preview */}
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
            isDragging
              ? "border-primary bg-primary/5 scale-[0.99]"
              : "border-outline-variant bg-surface-container-low hover:border-primary/50 hover:bg-surface-container"
          }`}
        >
          <input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            className="sr-only"
            disabled={isUploading}
          />
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-highest text-secondary group-hover:text-primary transition-colors">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <p className="mt-3 text-xs font-semibold text-on-surface">
            <span className="text-primary underline underline-offset-2">Click to browse</span> or drag and drop your file here
          </p>
          <p className="mt-1 text-[11px] text-secondary">
            PDF, Word (.doc, .docx), PowerPoint (.ppt, .pptx), Excel (.xls, .xlsx), Images, ZIP, or Text (Max 25 MB)
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Selected File Card */}
          <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-low p-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <FileTypeIcon
                mimeType={file.type}
                filename={file.name}
                category={getFileTypeCategory(file.type, file.name)}
                size="md"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-on-surface">{file.name}</p>
                <p className="text-[11px] text-secondary">
                  {formatBytes(file.size)} • {getFileTypeLabel(file.type, file.name)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClear}
              disabled={isUploading}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-secondary hover:bg-surface-container hover:text-error transition-colors disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Change</span>
            </button>
          </div>

          {/* Optional Display Name Input */}
          <div>
            <label
              htmlFor={nameInputId}
              className="block text-xs font-semibold text-on-surface"
            >
              Resource Display Name <span className="text-secondary font-normal">(optional)</span>
            </label>
            <input
              id={nameInputId}
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Chapter 3 Summary Notes"
              maxLength={MAX_MATERIAL_NAME_LENGTH}
              disabled={isUploading}
              className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <p className="mt-1 text-[11px] text-secondary">
              Name visible to students. Defaults to the filename.
            </p>
          </div>
        </div>
      )}

      {/* Upload State & Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
        <div className="text-[11px] text-secondary">
          {isUploading ? (
            <span className="flex items-center gap-2 text-primary font-medium">
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Uploading to secure storage...
            </span>
          ) : (
            <span>Private & encrypted in Cloudflare R2</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isUploading}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-secondary hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!file || isUploading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                <span>Upload Resource</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
