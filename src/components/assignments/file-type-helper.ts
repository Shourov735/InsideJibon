import { ASSIGNMENT_FILE_TYPES } from "@/schemas/assignment";
import { formatBytes, getFileTypeCategory, getFileTypeLabel } from "@/lib/material-utils";

export { formatBytes, getFileTypeCategory, getFileTypeLabel };

/**
 * Derives the accept string for file inputs based on allowed MIME types.
 * e.g. [".pdf", ".png", ".docx"] or undefined for all.
 */
export function getAcceptStringFromMimeTypes(allowedMimeTypes?: string[]): string {
  if (!allowedMimeTypes || allowedMimeTypes.length === 0) {
    // Default to all supported extensions
    const exts = Object.keys(ASSIGNMENT_FILE_TYPES).map((ext) => `.${ext}`);
    return exts.join(",");
  }

  const extensions: string[] = [];
  const allowedSet = new Set(allowedMimeTypes);

  for (const [ext, mimes] of Object.entries(ASSIGNMENT_FILE_TYPES)) {
    if (mimes.some((m) => allowedSet.has(m))) {
      extensions.push(`.${ext}`);
    }
  }

  return extensions.length > 0 ? extensions.join(",") : "*";
}

/**
 * Returns human-readable summary of allowed types for student / teacher display.
 */
export function getAllowedTypesSummary(
  allowedMimeTypes: string[] | undefined,
  locale: "en" | "bn" = "en"
): string {
  if (!allowedMimeTypes || allowedMimeTypes.length === 0) {
    return locale === "bn"
      ? "PDF, Word, Excel, PowerPoint, ছবি, টেক্সট, ZIP"
      : "PDF, Word, Excel, PowerPoint, Images, Text, ZIP";
  }

  const allowedSet = new Set(allowedMimeTypes);
  const matchedLabels: string[] = [];

  if (allowedSet.has("application/pdf")) matchedLabels.push("PDF");
  if (
    allowedSet.has("application/msword") ||
    allowedSet.has("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  ) {
    matchedLabels.push("Word (.doc, .docx)");
  }
  if (
    allowedSet.has("application/vnd.ms-excel") ||
    allowedSet.has("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  ) {
    matchedLabels.push("Excel (.xls, .xlsx)");
  }
  if (
    allowedSet.has("application/vnd.ms-powerpoint") ||
    allowedSet.has("application/vnd.openxmlformats-officedocument.presentationml.presentation")
  ) {
    matchedLabels.push("PowerPoint (.ppt, .pptx)");
  }
  if (
    allowedSet.has("image/png") ||
    allowedSet.has("image/jpeg") ||
    allowedSet.has("image/webp")
  ) {
    matchedLabels.push(locale === "bn" ? "ছবি (PNG, JPG, WebP)" : "Images (PNG, JPG, WebP)");
  }
  if (allowedSet.has("application/zip")) matchedLabels.push("ZIP");
  if (allowedSet.has("text/plain")) matchedLabels.push(locale === "bn" ? "টেক্সট (.txt)" : "Text (.txt)");

  return matchedLabels.length > 0
    ? matchedLabels.join(", ")
    : locale === "bn"
      ? "সকল সমর্থিত ফাইল"
      : "All supported formats";
}

/**
 * Returns the download URL for an assignment submission file.
 */
export function getSubmissionFileDownloadUrl(
  submissionId: string,
  fileId: string
): string {
  return `/api/assignments/submissions/${submissionId}/files/${fileId}/download`;
}
