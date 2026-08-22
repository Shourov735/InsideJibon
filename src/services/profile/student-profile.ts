import { eq, count, and } from "drizzle-orm";
import { getDb } from "@/db";
import { enrollments, lessonProgress } from "@/db/schema/learning";
import { examAttempts } from "@/db/schema/exams";
import { assignmentSubmissions } from "@/db/schema/assignments";

export async function getStudentProfileStats(userId: string) {
  const [
    enrollmentsCount,
    lessonsCompletedCount,
    examsTakenCount,
    assignmentsSubmittedCount,
  ] = await Promise.all([
    getDb()
      .select({ value: count() })
      .from(enrollments)
      .where(eq(enrollments.studentId, userId)),
    getDb()
      .select({ value: count() })
      .from(lessonProgress)
      .where(
        and(eq(lessonProgress.studentId, userId), eq(lessonProgress.completed, true))
      ),
    getDb()
      .select({ value: count() })
      .from(examAttempts)
      .where(eq(examAttempts.studentId, userId)),
    getDb()
      .select({ value: count() })
      .from(assignmentSubmissions)
      .where(eq(assignmentSubmissions.studentId, userId)),
  ]);

  return {
    totalCoursesEnrolled: enrollmentsCount[0].value,
    completedLessons: lessonsCompletedCount[0].value,
    examsTaken: examsTakenCount[0].value,
    assignmentsSubmitted: assignmentsSubmittedCount[0].value,
  };
}
