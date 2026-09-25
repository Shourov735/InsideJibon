"use client";

import { SubmissionFileItem } from "@/components/assignments/submission-file-item";
import type { SubmissionFileSummary } from "@/services/assignments";
import { useTranslations } from "@/i18n/client";

interface AssignmentFileListProps {
  files: SubmissionFileSummary[];
  canDelete: boolean;
  onDelete: (fileId: string) => void;
}

/**
 * R0 §4.5: extracted list of attached submission files. Pure
 * presentation — all upload/delete actions are owned by the parent
 * (the submission form). When `files.length === 0`, renders the empty
 * state inline.
 */
export function AssignmentFileList({
  files,
  canDelete,
  onDelete,
}: AssignmentFileListProps) {
  const { t } = useTranslations();

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
        {t("student.assignmentWorkspace.attachedFiles", { count: files.length })}
      </h3>

      {files.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-xs text-secondary italic">
          {t("student.assignmentWorkspace.noFilesAttached")}
        </div>
      ) : (
        <div className="space-y-2.5">
          {files.map((file) => (
            <SubmissionFileItem
              key={file.id}
              file={file}
              canDelete={canDelete}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
