import { eq, count, and } from "drizzle-orm";
import { getDb } from "@/db";
import { courses } from "@/db/schema/courses";
import { enrollments } from "@/db/schema/learning";

export async function getTeacherProfileStats(userId: string) {
  const [coursesCountResult, studentsCountResult] = await Promise.all([
    getDb()
      .select({ value: count() })
      .from(courses)
      .where(eq(courses.teacherId, userId)),
    getDb()
      .select({ value: count() })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(courses.teacherId, userId)),
  ]);

  return {
    totalCoursesCreated: coursesCountResult[0].value,
    totalStudents: studentsCountResult[0].value,
  };
}
