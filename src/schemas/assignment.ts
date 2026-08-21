import { z } from "zod";

/**
 * Zod contracts for teacher-side assignment management.
 * Teacher identity is NEVER part of these payloads — it always comes from
 * the verified session.
 *
 * Validation here shapes input at the trust boundary; publishing
 * preconditions are re-verified authoritatively in the service layer.
 */

export const ASSIGNMENT_FILE_TYPES: Record<string, readonly string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  xls: ["application/vnd.ms-excel"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  zip: ["application/zip"],
  txt: ["text/plain"],
};

export const ALLOWED_ASSIGNMENT_MIME_TYPES = new Set<string>(
  Object.values(ASSIGNMENT_FILE_TYPES).flat()
);

export const MAX_ASSIGNMENT_FILE_SIZE = 50 * 1024 * 1024; // 50 MB default max
export const MAX_ASSIGNMENT_TITLE_LENGTH = 120;
export const MAX_ASSIGNMENT_INSTRUCTIONS_LENGTH = 10000;
export const MAX_ASSIGNMENT_FEEDBACK_LENGTH = 5000;
export const MAX_POINTS = 1000;

export const createAssignmentSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  lessonId: z.string().uuid("Invalid lesson ID").optional().nullable(),
  title: z
    .string()
    .trim()
    .min(3, "Assignment title must be at least 3 characters")
    .max(MAX_ASSIGNMENT_TITLE_LENGTH, "Assignment title cannot exceed 120 characters"),
  instructions: z
    .string()
    .trim()
    .min(10, "Instructions must be at least 10 characters")
    .max(MAX_ASSIGNMENT_INSTRUCTIONS_LENGTH, "Instructions cannot exceed 10000 characters"),
  dueAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable()
    .or(z.literal("")),
  maxPoints: z.coerce
    .number("Maximum points must be a number")
    .int("Maximum points must be a whole number")
    .min(1, "Maximum points must be at least 1")
    .max(MAX_POINTS, "Maximum points cannot exceed 1000")
    .default(100),
  allowLateSubmission: z.boolean().default(false),
  allowedFileTypes: z
    .array(z.string())
    .default([])
    .refine(
      (types) => types.every((t) => ALLOWED_ASSIGNMENT_MIME_TYPES.has(t)),
      "One or more file types are not allowed"
    ),
  maxFileSize: z.coerce
    .number("Maximum file size must be a number")
    .int("Maximum file size must be a whole number")
    .min(1, "Maximum file size must be at least 1 byte")
    .max(MAX_ASSIGNMENT_FILE_SIZE, "Maximum file size cannot exceed 50 MB")
    .default(25 * 1024 * 1024),
});

export const updateAssignmentSchema = createAssignmentSchema.extend({
  assignmentId: z.string().uuid("Invalid assignment ID"),
});

export const assignmentActionByIdSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment ID"),
});

export const publishAssignmentSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment ID"),
});

export const closeAssignmentSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment ID"),
});

export const reopenAssignmentSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment ID"),
});

export const gradeSubmissionSchema = z.object({
  submissionId: z.string().uuid("Invalid submission ID"),
  points: z.coerce
    .number("Points must be a number")
    .int("Points must be a whole number")
    .min(0, "Points cannot be negative")
    .max(MAX_POINTS, "Points cannot exceed maximum allowed"),
  feedback: z
    .string()
    .trim()
    .max(MAX_ASSIGNMENT_FEEDBACK_LENGTH, "Feedback cannot exceed 5000 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const submitAssignmentSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment ID"),
});

export const deleteSubmissionFileSchema = z.object({
  fileId: z.string().uuid("Invalid file ID"),
});

export const uploadSubmissionFileSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment ID"),
  file: z.instanceof(File, { message: "No file was uploaded" }),
});

export type CreateAssignmentInput = z.input<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.input<typeof updateAssignmentSchema>;
export type PublishAssignmentInput = z.input<typeof publishAssignmentSchema>;
export type CloseAssignmentInput = z.input<typeof closeAssignmentSchema>;
export type ReopenAssignmentInput = z.input<typeof reopenAssignmentSchema>;
export type GradeSubmissionInput = z.input<typeof gradeSubmissionSchema>;
export type SubmitAssignmentInput = z.input<typeof submitAssignmentSchema>;
export type DeleteSubmissionFileInput = z.input<typeof deleteSubmissionFileSchema>;
export type UploadSubmissionFileInput = z.input<typeof uploadSubmissionFileSchema>;
export type AssignmentActionByIdInput = z.input<typeof assignmentActionByIdSchema>;

/**
 * Validates a submission file against assignment constraints.
 * Mirrors validateMaterialFile but with configurable allowed types/size.
 */
export function validateAssignmentFile(
  file: { name?: string; size?: number; type?: string },
  allowedMimeTypes: string[],
  maxFileSize: number
): { ok: true; file: { filename: string; extension: string; mimeType: string; sizeBytes: number } } | { ok: false; reason: "missing-filename" | "invalid-filename" | "unsupported-type" | "missing-mime" | "too-large" } {
  const name = file.name ?? "";
  const size = file.size ?? 0;
  const mimeType = file.type ?? "";

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, reason: "missing-filename" };
  if (trimmed.length > 255) return { ok: false, reason: "invalid-filename" };
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    return { ok: false, reason: "invalid-filename" };
  }
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
    return { ok: false, reason: "invalid-filename" };
  }

  if (!mimeType) return { ok: false, reason: "missing-mime" };
  if (size <= 0) return { ok: false, reason: "too-large" };
  if (size > maxFileSize) return { ok: false, reason: "too-large" };

  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0 || dot === trimmed.length - 1) return { ok: false, reason: "unsupported-type" };

  const extension = trimmed.slice(dot + 1).toLowerCase();
  const allowedForExt = ASSIGNMENT_FILE_TYPES[extension];
  if (!allowedForExt) return { ok: false, reason: "unsupported-type" };
  if (!allowedForExt.includes(mimeType)) return { ok: false, reason: "unsupported-type" };

  // Additional check: mime type must be in assignment's allowed list
  if (!allowedMimeTypes.includes(mimeType)) return { ok: false, reason: "unsupported-type" };

  return { ok: true, file: { filename: trimmed, extension, mimeType, sizeBytes: size } };
}

/**
 * Storage key design (deterministic, collision-resistant, server-controlled):
 *
 *   courses/{courseId}/assignments/{assignmentId}/submissions/{submissionId}/files/{fileId}/{safe-name}
 *
 * - fileId is a server-generated UUID, so keys cannot collide and cannot
 *   be forged by clients.
 * - The key is derived entirely from server-known values; client input only
 *   contributes the (sanitized) display filename.
 * - Keys group objects by course → assignment for potential lifecycle policies.
 */
export function buildAssignmentStorageKey(
  courseId: string,
  assignmentId: string,
  submissionId: string,
  fileId: string,
  originalFilename: string
): string {
  return `courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}/files/${fileId}/${sanitizeStorageName(originalFilename)}`;
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