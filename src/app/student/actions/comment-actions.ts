"use server";

import { requireStudent } from "@/lib/permissions";
import { createLessonComment, deleteLessonComment } from "@/services/learning/comments";
import { revalidatePath } from "next/cache";

export async function addCommentAction({ lessonId, content, courseId }: { lessonId: string, content: string, courseId: string }) {
  const user = await requireStudent();

  await createLessonComment(lessonId, user.id, content);
  revalidatePath(`/student/courses/${courseId}/learn`);
  return { success: true };
}

export async function deleteCommentAction({ commentId, courseId }: { commentId: string, courseId: string }) {
  const user = await requireStudent();

  await deleteLessonComment(commentId, user.id);
  revalidatePath(`/student/courses/${courseId}/learn`);
  return { success: true };
}
