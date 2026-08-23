import { getDb } from "@/db";
import {
  assignments,
  assignmentSubmissions,
  enrollments,
} from "@/db/schema";
import { eq, sql, count } from "drizzle-orm";
import { getTeacherCourseById } from "@/services/courses";

export async function getCourseAnalytics(teacherId: string, courseId: string) {
  const course = await getTeacherCourseById(teacherId, courseId);
  if (!course) throw new Error("Course not found or access denied");

  const db = getDb();

  // Both aggregates run concurrently. Submissions are scoped through the
  // course's own assignments (joining on studentId alone would count work
  // students submitted to other courses).
  const [[studentsResult], [submissionAgg]] = await Promise.all([
    db.select({ total: count() })
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId)),
    db.select({
      total: sql<number>`COUNT(*)::int`,
      graded: sql<number>`(COUNT(*) FILTER (WHERE ${assignmentSubmissions.status} = 'graded'))::int`,
    })
      .from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
      .where(eq(assignments.courseId, courseId)),
  ]);

  const totalStudents = Number(studentsResult?.total ?? 0);
  const totalSubmissions = submissionAgg?.total ?? 0;
  const gradedSubmissions = submissionAgg?.graded ?? 0;
  const pendingSubmissions = totalSubmissions - gradedSubmissions;

  return {
    totalStudents,
    totalSubmissions,
    gradedSubmissions,
    pendingSubmissions
  };
}
