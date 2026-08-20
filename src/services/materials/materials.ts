import "server-only";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db";
import { courseModules, courses, enrollments, lessons, materials } from "@/db/schema";
import type { Material } from "@/db/schema";
import { isUuid } from "@/lib/utils";
import type { Storage } from "@/lib/storage";
import {
  buildMaterialStorageKey,
  validateMaterialFile,
  type UploadMaterialInput,
  type UpdateMaterialInput,
} from "@/schemas/material";
import { toMaterialSummary, type MaterialSummary } from "@/types/material";

/**
 * Course material domain.
 *
 * Ownership is never supplied by the client — every teacher operation
 * resolves the chain material → lesson → module → course → teacherId in the
 * database. Every student operation resolves material → lesson → module →
 * course → enrollment (published only). Storage is injected via the `Storage`
 * interface so tests can run against `MemoryStorage` and R2 can be swapped
 * later without touching this module.
 */

export class MaterialNotFoundError extends Error {
  constructor() {
    super("Material not found.");
  }
}

export class MaterialAccessDeniedError extends Error {
  constructor() {
    super("Material not accessible.");
  }
}

export class LessonNotFoundError extends Error {
  constructor() {
    super("Lesson not found.");
  }
}

export class UnsupportedFileTypeError extends Error {
  constructor() {
    super("This file type is not supported. Upload a PDF, image, Office document, text file, or ZIP archive.");
  }
}

export class FileTooLargeError extends Error {
  constructor() {
    super("This file is too large. The maximum upload size is 25 MB.");
  }
}

export class InvalidFileError extends Error {
  constructor(message = "The uploaded file is invalid.") {
    super(message);
  }
}

export class UploadFailedError extends Error {
  constructor() {
    super("Upload failed. Please try again.");
  }
}

export interface UploadMaterialFile {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** Verifies the lesson belongs to a course owned by `teacherId`. */
async function resolveLessonForTeacher(
  teacherId: string,
  lessonId: string
): Promise<{ lessonId: string; courseId: string; courseStatus: string } | null> {
  if (!isUuid(lessonId)) return null;
  const db = getDb();
  const [row] = await db
    .select({
      lessonId: lessons.id,
      courseId: courses.id,
      courseStatus: courses.status,
    })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(and(eq(lessons.id, lessonId), eq(courses.teacherId, teacherId)))
    .limit(1);
  return row ?? null;
}

/** Resolves a material owned by `teacherId` (via the course chain). */
async function resolveMaterialForTeacher(
  teacherId: string,
  materialId: string
): Promise<{ material: Material; courseId: string } | null> {
  if (!isUuid(materialId)) return null;
  const db = getDb();
  const [row] = await db
    .select({ material: materials, courseId: courses.id })
    .from(materials)
    .innerJoin(lessons, eq(materials.lessonId, lessons.id))
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(and(eq(materials.id, materialId), eq(courses.teacherId, teacherId)))
    .limit(1);
  return row ?? null;
}

/**
 * Resolves a material for an enrolled student: material → lesson → module →
 * course → enrollment, published course only. Returns null (never throws) so
 * callers can render 404s without revealing whether the material exists.
 */
async function resolveMaterialForStudent(
  studentId: string,
  materialId: string
): Promise<Material | null> {
  if (!isUuid(materialId)) return null;
  const db = getDb();
  const [row] = await db
    .select({ material: materials })
    .from(materials)
    .innerJoin(lessons, eq(materials.lessonId, lessons.id))
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(materials.id, materialId),
        eq(enrollments.studentId, studentId),
        eq(courses.status, "published")
      )
    )
    .limit(1);
  return row?.material ?? null;
}

/** Verifies a student can access a lesson's materials (same rule as lessons). */
async function verifyLessonAccessForStudent(
  studentId: string,
  lessonId: string
): Promise<boolean> {
  if (!isUuid(lessonId)) return false;
  const db = getDb();
  const [row] = await db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(lessons.id, lessonId),
        eq(enrollments.studentId, studentId),
        eq(courses.status, "published")
      )
    )
    .limit(1);
  return row !== undefined;
}

function defaultNameFromFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(0, dot) : filename;
}

// ---------------------------------------------------------------------------
// Teacher operations
// ---------------------------------------------------------------------------

/**
 * Uploads a material to a lesson the teacher owns.
 *
 * Ordering: the DB metadata row is written first, then the bytes go to the
 * store. If the store write fails the row is rolled back — a crash between
 * the two leaves a metadata row whose object is missing, which download
 * handles as a safe 404-style error rather than an orphaned object.
 */
export async function uploadMaterial(
  teacherId: string,
  input: UploadMaterialInput,
  file: UploadMaterialFile,
  storage: Storage
): Promise<MaterialSummary> {
  const validation = validateMaterialFile(file);
  if (!validation.ok) {
    switch (validation.reason) {
      case "too-large":
        throw new FileTooLargeError();
      case "unsupported-type":
      case "missing-mime":
      case "missing-filename":
        throw new UnsupportedFileTypeError();
      default:
        throw new InvalidFileError();
    }
  }

  const target = await resolveLessonForTeacher(teacherId, input.lessonId);
  if (!target) throw new LessonNotFoundError();

  const materialId = randomUUID();
  const originalFilename = validation.file.filename;
  const storageKey = buildMaterialStorageKey(
    target.courseId,
    target.lessonId,
    materialId,
    originalFilename
  );

  const name = (input.name ?? "").trim() || defaultNameFromFilename(originalFilename);

  const db = getDb();
  const [row] = await db
    .insert(materials)
    .values({
      id: materialId,
      lessonId: target.lessonId,
      name,
      originalFilename,
      storageKey,
      mimeType: validation.file.mimeType,
      sizeBytes: validation.file.sizeBytes,
    })
    .returning();

  try {
    const bytes = await file.arrayBuffer();
    await storage.putObject({
      key: storageKey,
      body: bytes,
      contentType: validation.file.mimeType,
      customMetadata: { materialId, lessonId: target.lessonId },
    });
  } catch (error) {
    // Compensating rollback: the metadata row must not outlive a failed
    // store write. Logged at warn so the failure is observable.
    console.warn("R2 put failed after DB insert; rolling back material row:", error);
    await db.delete(materials).where(eq(materials.id, materialId)).catch((rollbackError) => {
      console.error("Failed to roll back material row after failed upload:", rollbackError);
    });
    throw new UploadFailedError();
  }

  return toMaterialSummary(row);
}

/**
 * Deletes a material the teacher owns. R2 object is removed first so a
 * failure leaves the metadata row intact (retryable) instead of an orphaned
 * object; the row is removed second.
 */
export async function deleteMaterial(
  teacherId: string,
  materialId: string,
  storage: Storage
): Promise<void> {
  const resolved = await resolveMaterialForTeacher(teacherId, materialId);
  if (!resolved) throw new MaterialNotFoundError();

  await storage.deleteObject(resolved.material.storageKey);

  const db = getDb();
  await db.delete(materials).where(eq(materials.id, materialId));
}

/** Renames a material the teacher owns. */
export async function updateMaterial(
  teacherId: string,
  materialId: string,
  input: UpdateMaterialInput
): Promise<MaterialSummary> {
  const resolved = await resolveMaterialForTeacher(teacherId, materialId);
  if (!resolved) throw new MaterialNotFoundError();

  const db = getDb();
  const [updated] = await db
    .update(materials)
    .set({ name: input.name.trim(), updatedAt: new Date() })
    .where(eq(materials.id, materialId))
    .returning();

  return toMaterialSummary(updated);
}

/** Lists materials attached to a lesson the teacher owns. */
export async function getTeacherLessonMaterials(
  teacherId: string,
  lessonId: string
): Promise<MaterialSummary[]> {
  const target = await resolveLessonForTeacher(teacherId, lessonId);
  if (!target) return [];

  const db = getDb();
  const rows = await db
    .select()
    .from(materials)
    .where(eq(materials.lessonId, lessonId))
    .orderBy(materials.createdAt);

  return rows.map((row) => toMaterialSummary(row));
}

/** Lists all materials across every lesson of a course the teacher owns. */
export async function getTeacherCourseMaterials(
  teacherId: string,
  courseId: string
): Promise<MaterialSummary[]> {
  if (!isUuid(courseId)) return [];
  const db = getDb();
  const rows = await db
    .select({ material: materials })
    .from(materials)
    .innerJoin(lessons, eq(materials.lessonId, lessons.id))
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .orderBy(materials.createdAt);

  return rows.map((row) => toMaterialSummary(row.material));
}

// ---------------------------------------------------------------------------
// Student operations
// ---------------------------------------------------------------------------

/**
 * Materials attached to a lesson the student can access, or null when the
 * lesson is not accessible (matches the existing lesson-access rules:
 * enrolled in the published course; free-lesson preview does NOT open up
 * materials to non-students).
 */
export async function getLessonMaterialsForStudent(
  studentId: string,
  lessonId: string
): Promise<MaterialSummary[] | null> {
  const accessible = await verifyLessonAccessForStudent(studentId, lessonId);
  if (!accessible) return null;

  const db = getDb();
  const rows = await db
    .select()
    .from(materials)
    .where(eq(materials.lessonId, lessonId))
    .orderBy(materials.createdAt);

  return rows.map((row) => toMaterialSummary(row));
}

/** True when the student may download the given material. */
export async function canStudentAccessMaterial(
  studentId: string,
  materialId: string
): Promise<boolean> {
  return (await resolveMaterialForStudent(studentId, materialId)) !== null;
}

/** Material metadata for a student, or null when inaccessible. */
export async function getMaterialForStudent(
  studentId: string,
  materialId: string
): Promise<MaterialSummary | null> {
  const material = await resolveMaterialForStudent(studentId, materialId);
  return material ? toMaterialSummary(material) : null;
}

/** Authorized download URL for a student, or null when inaccessible. */
export async function getMaterialDownloadUrlForStudent(
  studentId: string,
  materialId: string
): Promise<string | null> {
  const accessible = await canStudentAccessMaterial(studentId, materialId);
  return accessible ? `/api/materials/${materialId}/download` : null;
}

export type MaterialRequesterRole = "teacher" | "student";

/**
 * Resolves a material for a request from `userId` using the role-appropriate
 * authorization chain: teachers may only reach materials of courses they own
 * (any course status — they manage drafts too), students only materials of
 * lessons in published courses they are enrolled in. Returns null for both
 * "unauthorized" and "missing" so existence cannot be probed.
 */
export async function resolveMaterialForUser(
  userId: string,
  role: MaterialRequesterRole,
  materialId: string
): Promise<Material | null> {
  if (!isUuid(materialId)) return null;
  if (role === "teacher") {
    const resolved = await resolveMaterialForTeacher(userId, materialId);
    return resolved?.material ?? null;
  }
  return resolveMaterialForStudent(userId, materialId);
}

// ---------------------------------------------------------------------------
// Cleanup hooks (best-effort, non-transactional)
//
// PostgreSQL cascades material ROWS when a lesson or course is deleted, but
// the R2 objects cannot join that transaction. These hooks delete the bytes
// first and swallow storage errors (logging them) so course/lesson deletion
// never fails because R2 is unavailable. Any object left behind is logged
// and remains addressable only via its (now-orphaned) storage key.
// ---------------------------------------------------------------------------

export async function cleanupLessonMaterials(
  lessonId: string,
  storage: Storage
): Promise<void> {
  if (!isUuid(lessonId)) return;
  const db = getDb();
  try {
    const rows = await db.select().from(materials).where(eq(materials.lessonId, lessonId));
    for (const key of rows.map((row) => row.storageKey)) {
      await storage.deleteObject(key);
    }
  } catch (error) {
    console.warn("Best-effort R2 cleanup for lesson failed (rows will still cascade):", error);
  }
}

export async function cleanupCourseMaterials(
  courseId: string,
  storage: Storage
): Promise<void> {
  if (!isUuid(courseId)) return;
  const db = getDb();
  try {
    const rows = await db
      .select({ material: materials })
      .from(materials)
      .innerJoin(lessons, eq(materials.lessonId, lessons.id))
      .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
      .where(eq(courseModules.courseId, courseId));
    for (const key of rows.map((row) => row.material.storageKey)) {
      await storage.deleteObject(key);
    }
  } catch (error) {
    console.warn("Best-effort R2 cleanup for course failed (rows will still cascade):", error);
  }
}