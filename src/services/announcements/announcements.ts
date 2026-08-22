import "server-only";
import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  announcements,
  courses,
  enrollments,
  type Announcement,
} from "@/db/schema";
import { isUuid } from "@/lib/utils";
import type {
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "@/schemas/announcement";
import { createCourseNotifications } from "@/services/notifications";

export class AnnouncementNotFoundError extends Error {
  constructor() {
    super("Announcement not found.");
  }
}

/** Course → teacher. Returns null when the teacher does not own it. */
export async function verifyCourseOwnership(
  teacherId: string,
  courseId: string
): Promise<{ id: string } | null> {
  if (!isUuid(courseId)) return null;
  const db = getDb();
  const [row] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .limit(1);
  return row ?? null;
}

/** Announcement → course → teacher. Returns null when the chain does not own it. */
export async function verifyAnnouncementOwnership(
  teacherId: string,
  announcementId: string
): Promise<{ announcement: Announcement } | null> {
  if (!isUuid(announcementId)) return null;
  const db = getDb();
  const [row] = await db
    .select({ announcement: announcements })
    .from(announcements)
    .innerJoin(courses, eq(announcements.courseId, courses.id))
    .where(and(eq(announcements.id, announcementId), eq(courses.teacherId, teacherId)))
    .limit(1);

  return row ? { announcement: row.announcement } : null;
}

export async function createAnnouncement(
  teacherId: string,
  input: CreateAnnouncementInput
): Promise<Announcement> {
  const course = await verifyCourseOwnership(teacherId, input.courseId);
  if (!course) throw new AnnouncementNotFoundError();

  const db = getDb();
  const [announcement] = await db
    .insert(announcements)
    .values({
      courseId: input.courseId,
      title: input.title.trim(),
      content: input.content.trim(),
      isPinned: input.isPinned,
    })
    .returning();

  await createCourseNotifications(input.courseId, { 
    type: "announcement", 
    title: `New Announcement: ${announcement.title}`, 
    body: input.content.slice(0, 120), 
    link: "/student/notifications" 
  });

  return announcement;
}

export async function updateAnnouncement(
  teacherId: string,
  announcementId: string,
  input: UpdateAnnouncementInput
): Promise<Announcement> {
  const ownership = await verifyAnnouncementOwnership(teacherId, announcementId);
  if (!ownership) throw new AnnouncementNotFoundError();

  const db = getDb();
  const [updated] = await db
    .update(announcements)
    .set({
      title: input.title.trim(),
      content: input.content.trim(),
      isPinned: input.isPinned,
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, announcementId))
    .returning();

  return updated;
}

export async function deleteAnnouncement(
  teacherId: string,
  announcementId: string
): Promise<void> {
  const ownership = await verifyAnnouncementOwnership(teacherId, announcementId);
  if (!ownership) throw new AnnouncementNotFoundError();

  const db = getDb();
  await db.delete(announcements).where(eq(announcements.id, announcementId));
}

export async function togglePinAnnouncement(
  teacherId: string,
  announcementId: string
): Promise<Announcement> {
  const ownership = await verifyAnnouncementOwnership(teacherId, announcementId);
  if (!ownership) throw new AnnouncementNotFoundError();

  const db = getDb();
  const [updated] = await db
    .update(announcements)
    .set({
      isPinned: !ownership.announcement.isPinned,
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, announcementId))
    .returning();

  return updated;
}

export async function getTeacherAnnouncementsForCourse(
  teacherId: string,
  courseId: string
): Promise<Announcement[]> {
  const course = await verifyCourseOwnership(teacherId, courseId);
  if (!course) throw new AnnouncementNotFoundError();

  const db = getDb();
  return db
    .select()
    .from(announcements)
    .where(eq(announcements.courseId, courseId))
    .orderBy(desc(announcements.isPinned), desc(announcements.createdAt));
}

export async function getStudentAnnouncementsForCourse(
  studentId: string,
  courseId: string
): Promise<Announcement[]> {
  const db = getDb();
  const rows = await db
    .select({ announcement: announcements })
    .from(announcements)
    .innerJoin(courses, eq(announcements.courseId, courses.id))
    .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(announcements.courseId, courseId),
        eq(courses.status, "published"),
        eq(enrollments.studentId, studentId)
      )
    )
    .orderBy(desc(announcements.isPinned), desc(announcements.publishedAt));

  return rows.map((r) => r.announcement);
}

export async function getRecentAnnouncementsForStudent(
  studentId: string,
  limit: number = 5
): Promise<Announcement[]> {
  const db = getDb();
  
  const rows = await db
    .select({ announcement: announcements })
    .from(announcements)
    .innerJoin(courses, eq(announcements.courseId, courses.id))
    .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(courses.status, "published")
      )
    )
    .orderBy(desc(announcements.publishedAt))
    .limit(limit);

  return rows.map((r) => r.announcement);
}
