import "server-only";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { courseModules, courses, lessons, users } from "@/db/schema";
import type {
  PublicCourseDetail,
  PublicCourseSummary,
  PublicLesson,
  PublicModule,
  PublicTeacher,
} from "@/types/course";
import type { CourseCategory } from "@/db/schema";

export type { CourseCategory };

/**
 * Public, read-only course queries. These are a separate concern from the
 * teacher-facing services and always start from `status = 'published'`.
 * Draft and archived courses are never returned, and lesson content / video
 * URLs are never exposed.
 */

const moduleCountSql = sql<number>`(
  SELECT count(*)::int
  FROM ${courseModules}
  WHERE ${courseModules.courseId} = ${courses.id}
)`;

const lessonCountSql = sql<number>`(
  SELECT count(*)::int
  FROM ${lessons}
  INNER JOIN ${courseModules} ON ${lessons.moduleId} = ${courseModules.id}
  WHERE ${courseModules.courseId} = ${courses.id}
)`;

function toPublicTeacher(
  id: string,
  name: string | null,
  imageUrl: string | null
): PublicTeacher {
  return { id, name, imageUrl };
}

export interface PublicCoursesFilter {
  q?: string;
  category?: CourseCategory;
}

/**
 * Lists all published courses with module/lesson counts and teacher
 * information, ordered by most recently published first.
 * Supports optional search query and category filter.
 */
export async function getPublishedCourses(filter?: PublicCoursesFilter): Promise<PublicCourseSummary[]> {
  const db = getDb();

  const conditions = [eq(courses.status, "published")];
  if (filter?.q) {
    conditions.push(
      or(
        ilike(courses.title, `%${filter.q}%`),
        ilike(courses.description, `%${filter.q}%`)
      )!
    );
  }
  if (filter?.category) {
    conditions.push(eq(courses.category, filter.category));
  }

  const rows = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      description: courses.description,
      thumbnailUrl: courses.thumbnailUrl,
      category: courses.category,
      publishedAt: courses.publishedAt,
      teacherId: users.id,
      teacherName: users.name,
      teacherImageUrl: users.imageUrl,
      moduleCount: moduleCountSql,
      lessonCount: lessonCountSql,
    })
    .from(courses)
    .innerJoin(users, eq(courses.teacherId, users.id))
    .where(and(...conditions))
    .orderBy(desc(courses.publishedAt), desc(courses.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    category: row.category,
    publishedAt: row.publishedAt,
    teacher: toPublicTeacher(row.teacherId, row.teacherName, row.teacherImageUrl),
    moduleCount: row.moduleCount ?? 0,
    lessonCount: row.lessonCount ?? 0,
  }));
}

/**
 * Fetches a single published course (curriculum + safe teacher info) by slug.
 * Returns null for draft, archived or unknown courses so callers can notFound().
 */
export async function getPublishedCourseBySlugWithTeacher(
  slug: string
): Promise<PublicCourseDetail | null> {
  const db = getDb();

  const [row] = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      description: courses.description,
      thumbnailUrl: courses.thumbnailUrl,
      category: courses.category,
      publishedAt: courses.publishedAt,
      teacherId: users.id,
      teacherName: users.name,
      teacherImageUrl: users.imageUrl,
    })
    .from(courses)
    .innerJoin(users, eq(courses.teacherId, users.id))
    .where(and(eq(courses.slug, slug), eq(courses.status, "published")))
    .limit(1);

  if (!row) return null;

  const modulesList = await db
    .select({
      id: courseModules.id,
      position: courseModules.position,
      title: courseModules.title,
      description: courseModules.description,
    })
    .from(courseModules)
    .where(eq(courseModules.courseId, row.id))
    .orderBy(courseModules.position);

  const lessonRows = modulesList.length
    ? await db
        .select({
          id: lessons.id,
          moduleId: lessons.moduleId,
          position: lessons.position,
          title: lessons.title,
          description: lessons.description,
          isFree: lessons.isFree,
        })
        .from(lessons)
        .where(inArray(lessons.moduleId, modulesList.map((m) => m.id)))
        .orderBy(lessons.position)
    : [];

  const lessonsByModule = new Map<string, PublicLesson[]>();
  for (const lesson of lessonRows) {
    const bucket = lessonsByModule.get(lesson.moduleId) ?? [];
    bucket.push({
      id: lesson.id,
      position: lesson.position,
      title: lesson.title,
      description: lesson.description,
      isFree: lesson.isFree,
    });
    lessonsByModule.set(lesson.moduleId, bucket);
  }

  const modules: PublicModule[] = modulesList.map((mod) => ({
    id: mod.id,
    position: mod.position,
    title: mod.title,
    description: mod.description,
    lessons: lessonsByModule.get(mod.id) ?? [],
  }));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    category: row.category,
    publishedAt: row.publishedAt,
    teacher: toPublicTeacher(row.teacherId, row.teacherName, row.teacherImageUrl),
    moduleCount: modules.length,
    lessonCount: lessonRows.length,
    modules,
  };
}