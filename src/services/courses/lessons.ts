import "server-only";
import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { courseModules, courses, lessons, type Lesson } from "@/db/schema";
import { getDefaultStorage } from "@/lib/storage";
import { cleanupLessonMaterials } from "@/services/materials";
import type { CreateLessonInput, UpdateLessonInput } from "@/schemas/course";

/**
 * Verifies that the module belongs to a course owned by the teacher.
 */
async function verifyModuleOwnership(teacherId: string, moduleId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      module: courseModules,
      course: courses,
    })
    .from(courseModules)
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(and(eq(courseModules.id, moduleId), eq(courses.teacherId, teacherId)))
    .limit(1);

  if (!row) {
    throw new Error("Module not found or unauthorized");
  }
  return row;
}

/**
 * Verifies that the lesson belongs to a module/course owned by the teacher.
 */
async function verifyLessonOwnership(teacherId: string, lessonId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      lesson: lessons,
      module: courseModules,
      course: courses,
    })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(and(eq(lessons.id, lessonId), eq(courses.teacherId, teacherId)))
    .limit(1);

  if (!row) {
    throw new Error("Lesson not found or unauthorized");
  }
  return row;
}

/**
 * Creates a new lesson at the end of the module's lesson sequence.
 */
export async function createLesson(
  teacherId: string,
  input: CreateLessonInput
): Promise<Lesson> {
  const db = getDb();
  await verifyModuleOwnership(teacherId, input.moduleId);

  // Compute next 1-based position
  const [maxPos] = await db
    .select({ max: sql<number>`COALESCE(MAX(${lessons.position}), 0)::int` })
    .from(lessons)
    .where(eq(lessons.moduleId, input.moduleId));

  const nextPosition = (maxPos?.max ?? 0) + 1;

  const [lessonRow] = await db
    .insert(lessons)
    .values({
      moduleId: input.moduleId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      content: input.content?.trim() || null,
      videoUrl: input.videoUrl?.trim() || null,
      position: nextPosition,
      isFree: input.isFree ?? false,
    })
    .returning();

  return lessonRow;
}

/**
 * Updates an existing lesson.
 */
export async function updateLesson(
  teacherId: string,
  lessonId: string,
  input: UpdateLessonInput
): Promise<Lesson> {
  const db = getDb();
  await verifyLessonOwnership(teacherId, lessonId);

  const [updated] = await db
    .update(lessons)
    .set({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      content: input.content?.trim() || null,
      videoUrl: input.videoUrl?.trim() || null,
      isFree: input.isFree ?? false,
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, lessonId))
    .returning();

  return updated;
}

/**
 * Deletes a lesson and re-compacts the position sequence for the module.
 */
export async function deleteLesson(
  teacherId: string,
  lessonId: string,
  storage: import("@/lib/storage").Storage = getDefaultStorage()
): Promise<void> {
  const db = getDb();
  const { lesson: targetLesson } = await verifyLessonOwnership(teacherId, lessonId);

  // Best-effort R2 cleanup before the row is removed (the FK cascade
  // removes material rows; the bytes are deleted separately because R2
  // cannot join the Postgres transaction).
  await cleanupLessonMaterials(targetLesson.id, storage);

  // Delete the lesson
  await db.delete(lessons).where(eq(lessons.id, lessonId));

  // Re-compact remaining lessons for this module to 1..N
  const remaining = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(eq(lessons.moduleId, targetLesson.moduleId))
    .orderBy(lessons.position);

  for (let i = 0; i < remaining.length; i++) {
    await db
      .update(lessons)
      .set({ position: i + 1, updatedAt: new Date() })
      .where(eq(lessons.id, remaining[i].id));
  }
}

/**
 * Reorders lessons within a module based on an ordered array of lesson IDs.
 */
export async function reorderLessons(
  teacherId: string,
  moduleId: string,
  orderedLessonIds: string[]
): Promise<void> {
  const db = getDb();
  await verifyModuleOwnership(teacherId, moduleId);

  // Fetch all lessons currently in this module
  const existingLessons = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId));

  const existingIds = new Set(existingLessons.map((l) => l.id));

  // Validate that all ordered IDs belong to this module
  for (const id of orderedLessonIds) {
    if (!existingIds.has(id)) {
      throw new Error(`Lesson ${id} does not belong to this module`);
    }
  }

  // Update positions (1-based)
  for (let i = 0; i < orderedLessonIds.length; i++) {
    await db
      .update(lessons)
      .set({ position: i + 1, updatedAt: new Date() })
      .where(eq(lessons.id, orderedLessonIds[i]));
  }
}
