import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireStudent } from "@/lib/permissions";
import { getStudentCourseAssignmentsWithStatus } from "@/services/assignments";
import { getLearningCourse } from "@/services/learning";
import { StudentAssignmentList } from "@/components/student/assignments";
import { getTranslator } from "@/i18n/server";

interface CourseAssignmentsListPageProps {
  params: Promise<{ courseId: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: CourseAssignmentsListPageProps): Promise<Metadata> {
  const { courseId } = await params;
  if (!UUID_RE.test(courseId)) return { title: "Course Not Found" };
  const user = await requireStudent();
  const course = await getLearningCourse(user.id, courseId);
  return { title: course ? `${course.title} — Assignments` : "Course Not Found" };
}

export default async function StudentCourseAssignmentsPage({
  params,
}: CourseAssignmentsListPageProps) {
  const { courseId } = await params;
  if (!UUID_RE.test(courseId)) notFound();

  const user = await requireStudent();
  const t = await getTranslator();

  const [course, assignmentsList] = await Promise.all([
    getLearningCourse(user.id, courseId),
    getStudentCourseAssignmentsWithStatus(user.id, courseId),
  ]);

  if (!course || assignmentsList === null) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Student Course Assignments Directory */}
      <StudentAssignmentList
        assignments={assignmentsList}
        courseId={courseId}
        courseTitle={course.title}
      />
    </main>
  );
}
