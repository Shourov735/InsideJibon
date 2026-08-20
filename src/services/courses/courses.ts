import "server-only";
import { and, desc, eq, ne, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  courseModules,
  courses,
  lessons,
  type Course,
} from "@/db/schema";
import { slugify, type CreateCourseInput, type UpdateCourseInput } from "@/schemas/course";
import { getDefaultStorage } from "@/lib/storage";
import { cleanupCourseMaterials } from "@/services/materials";
import type {
  CourseWithCounts,
  CourseWithCurriculum,
  PublishValidationResult,
} from "@/types/course";
import type { Translator } from "@/i18n/core";

/**
 * Generates a guaranteed unique slug for a course.
 */
async function generateUniqueSlug(title: string, customSlug?: string, excludeCourseId?: string): Promise<string> {
  const db = getDb();
  let baseSlug = customSlug && customSlug.trim().length > 0 ? slugify(customSlug) : slugify(title);
  if (!baseSlug) {
    baseSlug = "course";
  }

  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select({ id: courses.id })
      .from(courses)
      .where(
        excludeCourseId
          ? and(eq(courses.slug, candidate), ne(courses.id, excludeCourseId))
          : eq(courses.slug, candidate)
      )
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }

    counter++;
    candidate = `${baseSlug}-${counter}`;
  }
}

/**
 * Creates a new course for the specified teacher in 'draft' status.
 */
export async function createCourse(
  teacherId: string,
  input: CreateCourseInput
): Promise<Course> {
  const db = getDb();
  const uniqueSlug = await generateUniqueSlug(input.title, input.slug);

  const [course] = await db
    .insert(courses)
    .values({
      teacherId,
      title: input.title.trim(),
      slug: uniqueSlug,
      description: input.description?.trim() || null,
      status: "draft",
    })
    .returning();

  return course;
}

/**
 * Fetches all courses owned by a teacher with module and lesson counts.
 */
export async function getTeacherCourses(
  teacherId: string
): Promise<CourseWithCounts[]> {
  const db = getDb();

  const teacherCourses = await db
    .select()
    .from(courses)
    .where(eq(courses.teacherId, teacherId))
    .orderBy(desc(courses.createdAt));

  if (teacherCourses.length === 0) return [];

  // Query counts for modules and lessons
  const result: CourseWithCounts[] = [];

  for (const course of teacherCourses) {
    const [modCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(courseModules)
      .where(eq(courseModules.courseId, course.id));

    const [lessonCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessons)
      .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
      .where(eq(courseModules.courseId, course.id));

    result.push({
      ...course,
      moduleCount: modCountRes?.count ?? 0,
      lessonCount: lessonCountRes?.count ?? 0,
    });
  }

  return result;
}

/**
 * Fetches a single teacher course by ID with ownership verification.
 */
export async function getTeacherCourseById(
  teacherId: string,
  courseId: string
): Promise<Course | null> {
  const db = getDb();
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .limit(1);

  return course ?? null;
}

/**
 * Fetches a full course curriculum (modules + ordered lessons) for a teacher.
 */
export async function getTeacherCourseWithCurriculum(
  teacherId: string,
  courseId: string
): Promise<CourseWithCurriculum | null> {
  const db = getDb();

  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .limit(1);

  if (!course) return null;

  const modulesList = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId))
    .orderBy(courseModules.position);

  const modulesWithLessons = [];

  for (const mod of modulesList) {
    const modLessons = await db
      .select()
      .from(lessons)
      .where(eq(lessons.moduleId, mod.id))
      .orderBy(lessons.position);

    modulesWithLessons.push({
      ...mod,
      lessons: modLessons,
    });
  }

  return {
    ...course,
    modules: modulesWithLessons,
  };
}

/**
 * Updates basic course details (title, slug, description, thumbnail).
 */
export async function updateCourse(
  teacherId: string,
  courseId: string,
  input: UpdateCourseInput
): Promise<Course> {
  const db = getDb();

  const existing = await getTeacherCourseById(teacherId, courseId);
  if (!existing) {
    throw new Error("Course not found or unauthorized");
  }

  // Ensure slug uniqueness
  const finalSlug = await generateUniqueSlug(input.title, input.slug, courseId);

  const [updated] = await db
    .update(courses)
    .set({
      title: input.title.trim(),
      slug: finalSlug,
      description: input.description?.trim() || null,
      thumbnailUrl: input.thumbnailUrl?.trim() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .returning();

  return updated;
}

/**
 * Deletes a course. Published courses cannot be casually deleted.
 */
export async function deleteCourse(
  teacherId: string,
  courseId: string,
  storage: import("@/lib/storage").Storage = getDefaultStorage()
): Promise<void> {
  const db = getDb();

  const existing = await getTeacherCourseById(teacherId, courseId);
  if (!existing) {
    throw new Error("Course not found or unauthorized");
  }

  if (existing.status === "published") {
    throw new Error(
      "Published courses cannot be permanently deleted. Please archive the course instead to preserve student access history."
    );
  }

  // Best-effort R2 cleanup before the rows cascade away (R2 cannot join the
  // Postgres transaction; cleanup failures are logged, not thrown).
  await cleanupCourseMaterials(courseId, storage);

  await db
    .delete(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)));
}

/**
 * Archives a course.
 */
export async function archiveCourse(
  teacherId: string,
  courseId: string
): Promise<Course> {
  const db = getDb();

  const existing = await getTeacherCourseById(teacherId, courseId);
  if (!existing) {
    throw new Error("Course not found or unauthorized");
  }

  const [updated] = await db
    .update(courses)
    .set({
      status: "archived",
      updatedAt: new Date(),
    })
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .returning();

  return updated;
}

/**
 * Restores an archived course back to draft status.
 */
export async function restoreCourse(
  teacherId: string,
  courseId: string
): Promise<Course> {
  const db = getDb();

  const existing = await getTeacherCourseById(teacherId, courseId);
  if (!existing) {
    throw new Error("Course not found or unauthorized");
  }

  const [updated] = await db
    .update(courses)
    .set({
      status: "draft",
      updatedAt: new Date(),
    })
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .returning();

  return updated;
}

/**
 * Evaluates publishing prerequisites for a course.
 */
export async function validateCourseForPublishing(
  teacherId: string,
  courseId: string,
  t?: Translator
): Promise<PublishValidationResult> {
  const courseWithCurriculum = await getTeacherCourseWithCurriculum(teacherId, courseId);

  if (!courseWithCurriculum) {
    return {
      canPublish: false,
      errors: t
        ? [t("teacher.publishCheck.courseNotFound")]
        : ["Course does not exist or you do not have permission."],
    };
  }

  const errors: string[] = [];

  if (!courseWithCurriculum.title || courseWithCurriculum.title.trim().length < 3) {
    errors.push(
      t
        ? t("teacher.publishCheck.courseTitleTooShort")
        : "Course title must be at least 3 characters long."
    );
  }

  if (!courseWithCurriculum.slug || courseWithCurriculum.slug.trim().length === 0) {
    errors.push(
      t ? t("teacher.publishCheck.courseSlugInvalid") : "Course must have a valid URL slug."
    );
  }

  if (!courseWithCurriculum.description || courseWithCurriculum.description.trim().length < 10) {
    errors.push(
      t
        ? t("teacher.publishCheck.courseDescriptionTooShort")
        : "Course description must be at least 10 characters long."
    );
  }

  if (courseWithCurriculum.modules.length === 0) {
    errors.push(t ? t("teacher.publishCheck.noModules") : "Course must contain at least one module.");
  } else {
    let totalLessons = 0;
    for (const mod of courseWithCurriculum.modules) {
      const modTitle = mod.title || (t ? t("teacher.publishCheck.untitled") : "Untitled");
      if (!mod.title || mod.title.trim().length < 2) {
        errors.push(
          t
            ? t("teacher.publishCheck.moduleTitleInvalid", { title: modTitle })
            : `Module "${modTitle}" must have a valid title.`
        );
      }
      totalLessons += mod.lessons.length;
      for (const lesson of mod.lessons) {
        const lessonTitle = lesson.title || (t ? t("teacher.publishCheck.untitled") : "Untitled");
        if (!lesson.title || lesson.title.trim().length < 2) {
          errors.push(
            t
              ? t("teacher.publishCheck.lessonTitleInvalid", { title: lessonTitle })
              : `Lesson "${lessonTitle}" must have a valid title.`
          );
        }
      }
    }

    if (totalLessons === 0) {
      errors.push(
        t ? t("teacher.publishCheck.noLessons") : "Course must contain at least one lesson across its modules."
      );
    }
  }

  return {
    canPublish: errors.length === 0,
    errors,
  };
}

/**
 * Publishes a course after strict business validation.
 */
export async function publishCourse(
  teacherId: string,
  courseId: string,
  t?: Translator
): Promise<Course> {
  const validation = await validateCourseForPublishing(teacherId, courseId, t);
  if (!validation.canPublish) {
    throw new Error(
      `${
        t ? t("teacher.publishCheck.cannotPublishCourse") : "Cannot publish course:"
      }\n${validation.errors.map((e) => `• ${e}`).join("\n")}`
    );
  }

  const db = getDb();
  const [updated] = await db
    .update(courses)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .returning();

  return updated;
}

/**
 * Unpublishes a course, returning it to draft status.
 */
export async function unpublishCourse(
  teacherId: string,
  courseId: string
): Promise<Course> {
  const db = getDb();

  const existing = await getTeacherCourseById(teacherId, courseId);
  if (!existing) {
    throw new Error("Course not found or unauthorized");
  }

  const [updated] = await db
    .update(courses)
    .set({
      status: "draft",
      updatedAt: new Date(),
    })
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .returning();

  return updated;
}

/**
 * Public course access service. Must explicitly require status = 'published'.
 */
export async function getPublishedCourseBySlug(
  slug: string
): Promise<CourseWithCurriculum | null> {
  const db = getDb();

  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.slug, slug), eq(courses.status, "published")))
    .limit(1);

  if (!course) return null;

  const modulesList = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.courseId, course.id))
    .orderBy(courseModules.position);

  const modulesWithLessons = [];

  for (const mod of modulesList) {
    const modLessons = await db
      .select()
      .from(lessons)
      .where(eq(lessons.moduleId, mod.id))
      .orderBy(lessons.position);

    modulesWithLessons.push({
      ...mod,
      lessons: modLessons,
    });
  }

  return {
    ...course,
    modules: modulesWithLessons,
  };
}
