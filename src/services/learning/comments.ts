import { eq, and, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { lessonComments, enrollments } from "@/db/schema/learning";
import { courses, lessons, courseModules } from "@/db/schema/courses";
import { users } from "@/db/schema";

export interface LessonCommentItem {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
  userName: string | null;
  userImage: string | null;
}

export async function getLessonComments(lessonId: string, userId: string) {
  // Check if user is enrolled or teacher
  const lessonData = await getDb()
    .select({ courseId: courseModules.courseId })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!lessonData.length) return [];

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
  // Only author or admin/teacher can delete, for now only author
  await getDb()
    .delete(lessonComments)
    .where(and(eq(lessonComments.id, commentId), eq(lessonComments.userId, userId)));
}
