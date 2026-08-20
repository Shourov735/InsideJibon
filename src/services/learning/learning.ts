import "server-only";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { isUuid } from "@/lib/utils";
import {
  courseModules,
  courses,
  enrollments,
  lessonProgress,
  lessons,
  users,
  type LessonProgress,
} from "@/db/schema";
import type {
  CourseProgress,
  LearningCourse,
  LessonAccess,
  StudentCourseSummary,
} from "@/types/learning";
import { getStudentEnrollments } from "@/services/enrollments";

/**
 * Student learning service. Every read and mutation derives access from the
 * database: a student can only ever see or touch lessons whose course they
 * are enrolled in AND that is currently published (lesson → module → course
 * → enrollment). IDs from the client are never trusted — the authenticated
 * studentId is threaded through every call.
 */

export class LessonAccessDeniedError extends Error {
  constructor() {
    super("Lesson not accessible.");
  }
}

function toPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Verifies that the lesson belongs to a published course the student is
 * enrolled in. Returns the full row chain or null when unauthorized so
 * callers can treat it as a 404 without revealing whether the resource
 * exists.
 */
async function verifyLessonAccess(studentId: string, lessonId: string) {
  const db = getDb();
  if (!isUuid(lessonId)) return null;
  const [row] = await db
    .select({
      lesson: lessons,
      module: courseModules,
      course: courses,
      teacherName: users.name,
    })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
    .leftJoin(users, eq(users.id, courses.teacherId))
    .where(
      and(
        eq(lessons.id, lessonId),
        eq(enrollments.studentId, studentId),
        eq(courses.status, "published")
      )
    )
    .limit(1);

  return row ?? null;
}

/**
 * Ordered flat list of every lesson in a course, respecting module order
 * then lesson position. Used for previous/next navigation.
 */
async function getOrderedCourseLessons(courseId: string) {
  const db = getDb();
  const modulesList = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId))
    .orderBy(courseModules.position);

  if (modulesList.length === 0) return [];

  const lessonRows = await db
    .select()
    .from(lessons)
    .where(inArray(lessons.moduleId, modulesList.map((m) => m.id)))
    .orderBy(lessons.position);

  const byModule = new Map<string, typeof lessonRows>();
  for (const lesson of lessonRows) {
    const bucket = byModule.get(lesson.moduleId) ?? [];
    bucket.push(lesson);
    byModule.set(lesson.moduleId, bucket);
  }

  const flat: Array<(typeof lessonRows)[number]> = [];
  for (const mod of modulesList) {
    flat.push(...(byModule.get(mod.id) ?? []));
  }
  return flat;
}

async function getCourseStatsForStudent(studentId: string, courseId: string) {
  const db = getDb();
  const ordered = await getOrderedCourseLessons(courseId);

  const total = ordered.length;
  let completed = 0;
  if (total > 0) {
    const [{ value }] = await db
      .select({ value: count() })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
      .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
      .where(
        and(
          eq(lessonProgress.studentId, studentId),
          eq(lessonProgress.completed, true),
          eq(courseModules.courseId, courseId)
        )
      );
    completed = value ?? 0;
  }

  const [last] = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      lastAccessedAt: lessonProgress.updatedAt,
    })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(
      and(
        eq(lessonProgress.studentId, studentId),
        eq(courseModules.courseId, courseId)
      )
    )
    .orderBy(desc(lessonProgress.updatedAt))
    .limit(1);

  return {
    total,
    completed,
    percent: toPercent(completed, total),
    lastLesson: last
      ? { id: last.id, title: last.title, lastAccessedAt: last.lastAccessedAt }
      : null,
  };
}

/**
 * Fetches the full learning workspace for an enrolled student. Returns null
 * when the course is not published or the student is not enrolled.
 */
export async function getLearningCourse(
  studentId: string,
  courseId: string
): Promise<LearningCourse | null> {
  const db = getDb();
  if (!isUuid(courseId)) return null;

  const [row] = await db
    .select({
      course: courses,
      teacherName: users.name,
      enrolledAt: enrollments.enrolledAt,
      completedAt: enrollments.completedAt,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(users, eq(users.id, courses.teacherId))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(courses.id, courseId),
        eq(courses.status, "published")
      )
    )
    .limit(1);

  if (!row) return null;

  const modulesList = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId))
    .orderBy(courseModules.position);

  const lessonRows = modulesList.length
    ? await db
        .select()
        .from(lessons)
        .where(inArray(lessons.moduleId, modulesList.map((m) => m.id)))
        .orderBy(lessons.position)
    : [];

  const lessonIds = lessonRows.map((l) => l.id);
  const progressRows = lessonIds.length
    ? await db
        .select()
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.studentId, studentId),
            inArray(lessonProgress.lessonId, lessonIds)
          )
        )
    : [];

  const progressByLesson = new Map<string, LessonProgress>();
  for (const p of progressRows) progressByLesson.set(p.lessonId, p);

  const lessonsByModule = new Map<string, typeof lessonRows>();
  for (const lesson of lessonRows) {
    const bucket = lessonsByModule.get(lesson.moduleId) ?? [];
    bucket.push(lesson);
    lessonsByModule.set(lesson.moduleId, bucket);
  }

  const modules = modulesList.map((mod) => {
    const modLessons = lessonsByModule.get(mod.id) ?? [];
    return {
      id: mod.id,
      position: mod.position,
      title: mod.title,
      description: mod.description,
      lessons: modLessons.map((lesson) => {
        const progress = progressByLesson.get(lesson.id);
        return {
          id: lesson.id,
          moduleId: lesson.moduleId,
          position: lesson.position,
          title: lesson.title,
          description: lesson.description,
          isFree: lesson.isFree,
          completed: progress?.completed ?? false,
          lastPosition: progress?.lastPosition ?? null,
        };
      }),
    };
  });

  const total = lessonRows.length;
  const completed = progressRows.filter((p) => p.completed).length;

  return {
    id: row.course.id,
    slug: row.course.slug,
    title: row.course.title,
    description: row.course.description,
    thumbnailUrl: row.course.thumbnailUrl,
    teacherName: row.teacherName,
    enrolledAt: row.enrolledAt,
    completedAt: row.completedAt,
    modules,
    progress: { completed, total, percent: toPercent(completed, total) },
  };
}

/**
 * Fetches a single lesson with full content and previous/next navigation for
 * an enrolled student. Returns null when the lesson is not accessible.
 */
export async function getLessonForStudent(
  studentId: string,
  lessonId: string
): Promise<LessonAccess | null> {
  const db = getDb();
  const access = await verifyLessonAccess(studentId, lessonId);
  if (!access) return null;

  const ordered = await getOrderedCourseLessons(access.course.id);
  const index = ordered.findIndex((l) => l.id === lessonId);

  const [progressRow] = await db
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.studentId, studentId),
        eq(lessonProgress.lessonId, lessonId)
      )
    )
    .limit(1);

  const completedCount = await (async () => {
    if (ordered.length === 0) return 0;
    const [{ value }] = await db
      .select({ value: count() })
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.studentId, studentId),
          eq(lessonProgress.completed, true),
          inArray(
            lessonProgress.lessonId,
            ordered.map((l) => l.id)
          )
        )
      );
    return value ?? 0;
  })();

  return {
    lesson: {
      id: access.lesson.id,
      title: access.lesson.title,
      description: access.lesson.description,
      content: access.lesson.content,
      videoUrl: access.lesson.videoUrl,
      position: access.lesson.position,
    },
    module: {
      id: access.module.id,
      title: access.module.title,
      position: access.module.position,
    },
    course: {
      id: access.course.id,
      slug: access.course.slug,
      title: access.course.title,
      teacherName: access.teacherName,
    },
    progress: progressRow
      ? {
          completed: progressRow.completed,
          completedAt: progressRow.completedAt,
          lastPosition: progressRow.lastPosition,
        }
      : null,
    prevLessonId: index > 0 ? ordered[index - 1].id : null,
    nextLessonId: index >= 0 && index < ordered.length - 1 ? ordered[index + 1].id : null,
    totalLessons: ordered.length,
    completedCount,
  };
}

/**
 * Re-derives the enrollment's completion state from lesson progress.
 * An enrollment is complete when every lesson in the course is completed.
 */
async function syncEnrollmentCompletion(
  studentId: string,
  courseId: string
): Promise<void> {
  const db = getDb();
  const stats = await getCourseStatsForStudent(studentId, courseId);

  const now = new Date();
  if (stats.total > 0 && stats.completed >= stats.total) {
    await db
      .update(enrollments)
      .set({ completedAt: sql`COALESCE(${enrollments.completedAt}, ${now})` })
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.courseId, courseId)
        )
      );
  } else {
    await db
      .update(enrollments)
      .set({ completedAt: null })
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.courseId, courseId)
        )
      );
  }
}

/**
 * Marks a lesson completed for the student. Throws LessonAccessDeniedError
 * when the student is not enrolled in the lesson's published course.
 */
export async function markLessonCompleted(
  studentId: string,
  lessonId: string
): Promise<{ courseId: string }> {
  const db = getDb();
  const access = await verifyLessonAccess(studentId, lessonId);
  if (!access) throw new LessonAccessDeniedError();

  const now = new Date();
  await db
    .insert(lessonProgress)
    .values({
      studentId,
      lessonId,
      completed: true,
      completedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [lessonProgress.studentId, lessonProgress.lessonId],
      set: {
        completed: true,
        // Preserve the original completion time — repeated completion of an
        // already-completed lesson is a no-op apart from the updatedAt bump.
        completedAt: sql`COALESCE(${lessonProgress.completedAt}, ${now})`,
        updatedAt: now,
      },
    });

  await syncEnrollmentCompletion(studentId, access.course.id);
  return { courseId: access.course.id };
}

/**
 * Un-completes a lesson for the student. Throws LessonAccessDeniedError when
 * the student is not enrolled in the lesson's published course.
 */
export async function unmarkLessonCompleted(
  studentId: string,
  lessonId: string
): Promise<{ courseId: string }> {
  const db = getDb();
  const access = await verifyLessonAccess(studentId, lessonId);
  if (!access) throw new LessonAccessDeniedError();

  const existing = await getLessonProgressRow(studentId, lessonId);

  if (existing) {
    const now = new Date();
    await db
      .update(lessonProgress)
      .set({ completed: false, completedAt: null, updatedAt: now })
      .where(
        and(
          eq(lessonProgress.studentId, studentId),
          eq(lessonProgress.lessonId, lessonId)
        )
      );
  }

  await syncEnrollmentCompletion(studentId, access.course.id);
  return { courseId: access.course.id };
}

/**
 * Records the student's position within a lesson (e.g. seconds into a video)
 * so learning can resume exactly where they left off.
 */
export async function updateLessonPosition(
  studentId: string,
  lessonId: string,
  position: number
): Promise<{ courseId: string }> {
  const db = getDb();
  const access = await verifyLessonAccess(studentId, lessonId);
  if (!access) throw new LessonAccessDeniedError();

  const now = new Date();
  await db
    .insert(lessonProgress)
    .values({ studentId, lessonId, lastPosition: position, updatedAt: now })
    .onConflictDoUpdate({
      target: [lessonProgress.studentId, lessonProgress.lessonId],
      set: { lastPosition: position, updatedAt: now },
    });

  return { courseId: access.course.id };
}

async function getLessonProgressRow(
  studentId: string,
  lessonId: string
): Promise<LessonProgress | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.studentId, studentId),
        eq(lessonProgress.lessonId, lessonId)
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Progress for a published course the student is enrolled in, or null.
 */
export async function getCourseProgress(
  studentId: string,
  courseId: string
): Promise<CourseProgress | null> {
  const access = await getLearningCourse(studentId, courseId);
  return access ? access.progress : null;
}

/**
 * Most recently accessed lesson in a course (by progress updatedAt).
 */
export async function getLastAccessedLesson(
  studentId: string,
  courseId: string
): Promise<{ id: string; title: string } | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: lessons.id, title: lessons.title })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(
      and(
        eq(lessonProgress.studentId, studentId),
        eq(courseModules.courseId, courseId)
      )
    )
    .orderBy(desc(lessonProgress.updatedAt))
    .limit(1);

  return row ?? null;
}

/**
 * Student dashboard payload: every published course the student is enrolled
 * in, with progress and resume point.
 */
export async function getStudentDashboard(
  studentId: string
): Promise<StudentCourseSummary[]> {
  const enrollmentsList = await getStudentEnrollments(studentId);
  const published = enrollmentsList.filter(
    (item) => item.course.status === "published"
  );

  const summaries: StudentCourseSummary[] = [];
  for (const item of published) {
    const stats = await getCourseStatsForStudent(studentId, item.course.id);
    summaries.push({
      courseId: item.course.id,
      slug: item.course.slug,
      title: item.course.title,
      description: item.course.description,
      thumbnailUrl: item.course.thumbnailUrl,
      teacherName: item.teacherName,
      enrolledAt: item.enrolledAt,
      completedAt: item.completedAt,
      progress: {
        completed: stats.completed,
        total: stats.total,
        percent: stats.percent,
      },
      lastLesson: stats.lastLesson,
    });
  }

  return summaries;
}