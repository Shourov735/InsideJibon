import { eq, and, desc } from "drizzle-orm";
import "server-only";
import { getDb } from "@/db";
import { lessonComments } from "@/db/schema/learning";
import { lessons, courseModules } from "@/db/schema/courses";
import { isStudentEnrolled } from "@/services/enrollments/enrollments";
import { users } from "@/db/schema";

export interface LessonCommentItem {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
  userName: string | null;
  userImage: string | null;
}

/**
 * Resolves the owning course of a lesson and verifies the student is
 * enrolled in it. Returns false when the lesson does not exist or the
 * student has no active enrollment.
 */
async function canAccessLesson(userId: string, lessonId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ courseId: courseModules.courseId })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!rows.length) return false;

  return isStudentEnrolled(userId, rows[0].courseId);
}

export async function getLessonComments(lessonId: string, userId: string) {
  if (!(await canAccessLesson(userId, lessonId))) return [];

  const comments = await getDb()
    .select({
      id: lessonComments.id,
      content: lessonComments.content,
      createdAt: lessonComments.createdAt,
      userId: lessonComments.userId,
      userName: users.name,
      userImage: users.imageUrl,
    })
    .from(lessonComments)
    .innerJoin(users, eq(lessonComments.userId, users.id))
    .where(eq(lessonComments.lessonId, lessonId))
    .orderBy(desc(lessonComments.createdAt));

  return comments;
}

export async function createLessonComment(lessonId: string, userId: string, content: string) {
  if (!(await canAccessLesson(userId, lessonId))) {
    throw new Error("You are not enrolled in this course.");
  }

  const [comment] = await getDb()
    .insert(lessonComments)
    .values({
      lessonId,
      userId,
      content,
    })
    .returning();

  return comment;
}

export async function deleteLessonComment(commentId: string, userId: string) {
  // Only the author may delete their own comment.
  await getDb()
    .delete(lessonComments)
    .where(and(eq(lessonComments.id, commentId), eq(lessonComments.userId, userId)));
}
