/**
 * Utilities and formatters for course materials.
 */

export type FileCategory =
  | "pdf"
  | "doc"
  | "ppt"
  | "xls"
  | "image"
  | "archive"
  | "text"
  | "generic";

/**
 * Formats byte sizes into human-readable strings (e.g. 2.4 MB, 840 KB, 15 B).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unitIndex = Math.min(i, sizes.length - 1);
  const value = bytes / Math.pow(k, unitIndex);

  return `${parseFloat(value.toFixed(dm))} ${sizes[unitIndex]}`;
}

/**
 * Derives a normalized file extension from a filename.
 */
export function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || dot === filename.length - 1) return "";
  return filename.slice(dot + 1).toLowerCase();
}

/**
 * Categorizes a file by MIME type and filename for styling and icon selection.
 */
export function getFileTypeCategory(mimeType: string, filename: string): FileCategory {
  const ext = getFileExtension(filename);
  const mime = (mimeType || "").toLowerCase();

  if (ext === "pdf" || mime === "application/pdf") return "pdf";

  if (
    ext === "doc" ||
    ext === "docx" ||
    mime === "application/msword" ||
    mime.includes("wordprocessingml")
  ) {
    return "doc";
  }

  if (
    ext === "ppt" ||
    ext === "pptx" ||
    mime === "application/vnd.ms-powerpoint" ||
    mime.includes("presentationml")
  ) {
    return "ppt";
  }

  if (
    ext === "xls" ||
    ext === "xlsx" ||
    mime === "application/vnd.ms-excel" ||
    mime.includes("spreadsheetml")
  ) {
    return "xls";
  }

  if (
    ["png", "jpg", "jpeg", "webp"].includes(ext) ||
    mime.startsWith("image/")
  ) {
    return "image";
  }

  if (ext === "zip" || mime === "application/zip" || mime.includes("zip")) {
    return "archive";
  }

  if (ext === "txt" || mime === "text/plain") {
    return "text";
  }

  return "generic";
}

/**
 * Returns a human-friendly label for a file type (e.g. "PDF Document", "Excel Sheet").
 */
export function getFileTypeLabel(mimeType: string, filename: string): string {
  const category = getFileTypeCategory(mimeType, filename);
  switch (category) {
    case "pdf":
      return "PDF Document";
    case "doc":
      return "Word Document";
    case "ppt":
      return "PowerPoint Presentation";
    case "xls":
      return "Excel Spreadsheet";
    case "image":
      return "Image File";
    case "archive":
      return "ZIP Archive";
    case "text":
      return "Text File";
    default:
      return "Attachment";
  }
}

/**
 * Static download route helper for materials.
 */
export function getMaterialDownloadUrl(materialId: string): string {
  return `/api/materials/${materialId}/download`;
}

/**
 * Formats dates for materials (e.g. "Aug 20, 2026").
 */
export function formatMaterialDate(date: Date | string): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}
