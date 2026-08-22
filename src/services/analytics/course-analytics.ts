import { getDb } from "@/db";
import { enrollments, assignmentSubmissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { count } from "drizzle-orm";
import { getTeacherCourseById } from "@/services/courses";

export async function getCourseAnalytics(teacherId: string, courseId: string) {
  const course = await getTeacherCourseById(teacherId, courseId);
  if (!course) throw new Error("Course not found or access denied");

  const db = getDb();
  
  // Total students
  const [studentsResult] = await db.select({ count: count() })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId));
  const totalStudents = studentsResult.count;

  // Submissions count
  const submissionsQuery = await db.select()
    .from(assignmentSubmissions)
    .innerJoin(enrollments, eq(assignmentSubmissions.studentId, enrollments.studentId))
    .where(eq(enrollments.courseId, courseId));
    
  const totalSubmissions = submissionsQuery.length;
  
  const gradedSubmissions = submissionsQuery.filter(s => s.assignment_submissions.status === "graded").length;
  const pendingSubmissions = totalSubmissions - gradedSubmissions;

  return {
    totalStudents,
    totalSubmissions,
    gradedSubmissions,
    pendingSubmissions
  };
}
