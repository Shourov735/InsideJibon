import { z } from "zod";

/**
 * Material metadata contracts and file-validation rules.
 *
 * File validation is deliberately strict and server-side: the browser's
 * declared MIME type and size are never trusted on their own. A file passes
 * only when its extension maps to an allowed MIME type AND the declared
 * MIME type is one of the allowed values for that extension.
 */

export const MAX_MATERIAL_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_MATERIAL_NAME_LENGTH = 150;
export const MAX_FILENAME_LENGTH = 255;

/**
 * Allowed educational file types. Extension → allowed MIME types.
 * Kept intentionally small: PDF, images, Office documents and ZIP archives.
 */
export const MATERIAL_FILE_TYPES: Record<string, readonly string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  zip: ["application/zip"],
  txt: ["text/plain"],
};

export const ALLOWED_MATERIAL_MIME_TYPES = new Set<string>(
  Object.values(MATERIAL_FILE_TYPES).flat()
);

export type MaterialFileRejection =
  | "missing-filename"
  | "invalid-filename"
  | "unsupported-type"
  | "missing-mime"
  | "too-large";

export interface ValidatedMaterialFile {
  filename: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Validates the raw upload payload (a browser `File`). Returns the trusted
 * file facts on success, or a rejection reason on failure.
 */
export function validateMaterialFile(file: {
  name?: string;
  size?: number;
  type?: string;
}): { ok: true; file: ValidatedMaterialFile } | { ok: false; reason: MaterialFileRejection } {
  const name = file.name ?? "";
  const size = file.size ?? 0;
  const mimeType = file.type ?? "";

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, reason: "missing-filename" };
  if (trimmed.length > MAX_FILENAME_LENGTH) return { ok: false, reason: "invalid-filename" };
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    return { ok: false, reason: "invalid-filename" };
  }
  // Reject control characters / line breaks outright (header-safety).
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
    return { ok: false, reason: "invalid-filename" };
  }

  if (!mimeType) return { ok: false, reason: "missing-mime" };
  if (size <= 0) return { ok: false, reason: "too-large" };
  if (size > MAX_MATERIAL_SIZE_BYTES) return { ok: false, reason: "too-large" };

  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0 || dot === trimmed.length - 1) return { ok: false, reason: "unsupported-type" };

  const extension = trimmed.slice(dot + 1).toLowerCase();
  const allowedMimes = MATERIAL_FILE_TYPES[extension];
  if (!allowedMimes) return { ok: false, reason: "unsupported-type" };
  if (!allowedMimes.includes(mimeType)) return { ok: false, reason: "unsupported-type" };

  return { ok: true, file: { filename: trimmed, extension, mimeType, sizeBytes: size } };
}

/** Form metadata for an upload. Lesson identity comes from the server action. */
export const uploadMaterialSchema = z.object({
  lessonId: z.string().uuid("Invalid lesson ID"),
  name: z
    .string()
    .trim()
    .max(MAX_MATERIAL_NAME_LENGTH, "Material name is too long")
    .optional()
    .or(z.literal("")),
});

export const deleteMaterialSchema = z.object({
  materialId: z.string().uuid("Invalid material ID"),
});

export const updateMaterialSchema = z.object({
  materialId: z.string().uuid("Invalid material ID"),
  name: z
    .string()
    .trim()
    .min(1, "Material name is required")
    .max(MAX_MATERIAL_NAME_LENGTH, "Material name is too long"),
});

export type UploadMaterialInput = z.input<typeof uploadMaterialSchema>;
export type DeleteMaterialInput = z.input<typeof deleteMaterialSchema>;
export type UpdateMaterialInput = z.input<typeof updateMaterialSchema>;

/**
 * Storage key design (deterministic, collision-resistant, server-controlled):
 *
 *   courses/{courseId}/lessons/{lessonId}/materials/{materialId}/{safe-name}
 *
 * - materialId is a server-generated UUID, so keys cannot collide and cannot
 *   be forged by clients.
 * - The key is derived entirely from server-known values; client input only
 *   contributes the (sanitized) display filename.
 * - Keys group objects by course → lesson for potential lifecycle policies.
 */
export function buildMaterialStorageKey(
  courseId: string,
  lessonId: string,
  materialId: string,
  originalFilename: string
): string {
  return `courses/${courseId}/lessons/${lessonId}/materials/${materialId}/${sanitizeStorageName(originalFilename)}`;
}

/**
 * Reduces an arbitrary filename to a safe key segment: lowercase
 * alphanumerics, dots, underscores and hyphens, trimmed to 60 chars while
 * preserving the extension. Never contains path separators or control chars.
 */
export function sanitizeStorageName(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "").toLowerCase();
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  const dot = cleaned.lastIndexOf(".");
  const hasExtension = dot > 0 && dot < cleaned.length - 1;
  const stem = (hasExtension ? cleaned.slice(0, dot) : cleaned).replace(/-+$/, "");
  const ext = hasExtension ? cleaned.slice(dot) : "";
  return `${stem.slice(0, 60 - ext.length) || "file"}${ext}`;
}

/** RFC 5987 filename for Content-Disposition (safe for non-ASCII names). */
export function toContentDispositionFilename(filename: string): string {
  return filename.replace(/[\r\n\u0000-\u001f]/g, "").trim() || "download";
}