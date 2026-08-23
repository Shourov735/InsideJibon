import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { courseModules, courses, type CourseModule } from "@/db/schema";
import type { CreateModuleInput, UpdateModuleInput } from "@/schemas/course";

/**
 * Verifies that the course belongs to the teacher.
 */
async function verifyCourseOwnership(teacherId: string, courseId: string) {
  const db = getDb();
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .limit(1);

  if (!course) {
    throw new Error("Course not found or unauthorized");
  }
  return course;
}

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
 * Creates a new module at the end of the course's module sequence.
 */
export async function createModule(
  teacherId: string,
  input: CreateModuleInput
): Promise<CourseModule> {
  const db = getDb();
  await verifyCourseOwnership(teacherId, input.courseId);

  // Compute next 1-based position
  const [maxPos] = await db
    .select({ max: sql<number>`COALESCE(MAX(${courseModules.position}), 0)::int` })
    .from(courseModules)
    .where(eq(courseModules.courseId, input.courseId));

  const nextPosition = (maxPos?.max ?? 0) + 1;

  const [moduleRow] = await db
    .insert(courseModules)
    .values({
      courseId: input.courseId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      position: nextPosition,
    })
    .returning();

  return moduleRow;
}

/**
 * Updates an existing module's title and description.
 */
export async function updateModule(
  teacherId: string,
  moduleId: string,
  input: UpdateModuleInput
): Promise<CourseModule> {
  const db = getDb();
  await verifyModuleOwnership(teacherId, moduleId);

  const [updated] = await db
    .update(courseModules)
    .set({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(courseModules.id, moduleId))
    .returning();

  return updated;
}

/**
 * Deletes a module and re-compacts the position sequence for the course.
 */
export async function deleteModule(
  teacherId: string,
  moduleId: string
): Promise<void> {
  const db = getDb();
  const { module: targetModule } = await verifyModuleOwnership(teacherId, moduleId);

  // Delete the module (cascades to its lessons in DB)
  await db.delete(courseModules).where(eq(courseModules.id, moduleId));

  // Re-compact remaining modules for this course to 1..N in one round-trip
  const remaining = await db
    .select({ id: courseModules.id })
    .from(courseModules)
    .where(eq(courseModules.courseId, targetModule.courseId))
    .orderBy(courseModules.position);

  if (remaining.length > 0) {
    const now = new Date();
    await db
      .update(courseModules)
      .set({
        position: sql`CASE ${sql.join(
          remaining.map((row, i) =>
            sql`WHEN ${courseModules.id} = ${row.id}::uuid THEN ${i + 1}`
          ),
          sql` `
        )} ELSE ${courseModules.position} END`,
        updatedAt: now,
      })
      .where(
        inArray(
          courseModules.id,
          remaining.map((row) => row.id)
        )
      );
  }
}

/**
 * Reorders modules within a course based on an ordered array of module IDs.
 */
export async function reorderModules(
  teacherId: string,
  courseId: string,
  orderedModuleIds: string[]
): Promise<void> {
  const db = getDb();
  await verifyCourseOwnership(teacherId, courseId);

  // Fetch all modules currently in this course
  const existingModules = await db
    .select({ id: courseModules.id })
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId));

  const existingIds = new Set(existingModules.map((m) => m.id));

  // Validate that all ordered IDs belong to this course
  for (const id of orderedModuleIds) {
    if (!existingIds.has(id)) {
      throw new Error(`Module ${id} does not belong to this course`);
    }
  }

  // Update positions (1-based) in one statement
  if (orderedModuleIds.length > 0) {
    const now = new Date();
    await db
      .update(courseModules)
      .set({
        position: sql`CASE ${sql.join(
          orderedModuleIds.map(
            (moduleId, i) => sql`WHEN ${courseModules.id} = ${moduleId}::uuid THEN ${i + 1}`
          ),
          sql` `
        )} ELSE ${courseModules.position} END`,
        updatedAt: now,
      })
      .where(inArray(courseModules.id, orderedModuleIds));
  }
}
