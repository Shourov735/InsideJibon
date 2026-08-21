import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/permissions";
import {
  getTeacherAssignmentById,
  validateAssignmentForPublishing,
  getSubmissionsForAssignment,
  getAssignmentStatistics,
  getSubmissionDetailForTeacher,
} from "@/services/assignments";
import { getTeacherCourseById } from "@/services/courses";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { AssignmentDetailView } from "@/components/teacher/assignments";
import type { SubmissionDetail } from "@/services/assignments";

interface AssignmentDetailPageProps {
  params: Promise<{ assignmentId: string }>;
}

export default async function TeacherAssignmentDetailPage({ params }: AssignmentDetailPageProps) {
  const teacher = await requireTeacher();
  const { assignmentId } = await params;

  const assignment = await getTeacherAssignmentById(teacher.id, assignmentId);
  if (!assignment) {
    notFound();
  }

  const [course, validation, submissions, stats] = await Promise.all([
    getTeacherCourseById(teacher.id, assignment.courseId),
    validateAssignmentForPublishing(teacher.id, assignmentId),
    getSubmissionsForAssignment(teacher.id, assignmentId),
    getAssignmentStatistics(teacher.id, assignmentId),
  ]);

  // Fetch full details with files for each submitted/graded submission to populate the grading drawer map
  const detailedEntries = await Promise.all(
    submissions.map(async (sub) => {
      try {
        const detail = await getSubmissionDetailForTeacher(teacher.id, sub.id);
        return [sub.id, detail] as const;
      } catch {
        return null;
      }
    })
  );

  const detailedSubmissionsMap: Record<string, SubmissionDetail> = {};
  for (const entry of detailedEntries) {
    if (entry && entry[1]) {
      detailedSubmissionsMap[entry[0]] = entry[1];
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="assignments" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <AssignmentDetailView
          assignment={assignment}
          courseTitle={course?.title ?? "Course"}
          validation={validation}
          submissions={submissions}
          stats={stats}
          detailedSubmissionsMap={detailedSubmissionsMap}
        />
      </main>
    </div>
  );
}
