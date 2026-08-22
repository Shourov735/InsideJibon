import { getDb } from "@/db";
import { notifications, Notification, enrollments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { count } from "drizzle-orm";

export async function createNotification(userId: string, input: { type: Notification["type"], title: string, body: string, link?: string }): Promise<Notification> {
  const db = getDb();
  const [notification] = await db.insert(notifications).values({
    userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
  }).returning();
  return notification;
}

export async function createCourseNotifications(courseId: string, input: { type: Notification["type"], title: string, body: string, link?: string }): Promise<void> {
  const db = getDb();
  const students = await db.select().from(enrollments).where(eq(enrollments.courseId, courseId));
  for (const student of students) {
    try {
      await createNotification(student.studentId, input);
    } catch (error) {
      console.error(`Failed to create notification for student ${student.studentId}`, error);
    }
  }
}

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const db = getDb();
  return db.select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const db = getDb();
  const [result] = await db.select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result.count;
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const db = getDb();
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const db = getDb();
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  const db = getDb();
  await db.delete(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}
