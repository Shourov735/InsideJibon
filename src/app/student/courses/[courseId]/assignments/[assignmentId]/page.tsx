import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireStudent } from "@/lib/permissions";
import {
  verifyStudentAssignmentAccess,
  getStudentSubmission,
  getSubmissionFilesForStudent,
  isLateSubmission,
  canResubmit,
} from "@/services/assignments";
import { getLearningCourse } from "@/services/learning";
import { StudentAssignmentWorkspace } from "@/components/student/assignments";
import type { AssignmentSubmissionFile } from "@/db/schema";

interface StudentAssignmentWorkspacePageProps {
  params: Promise<{ courseId: string; assignmentId: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: StudentAssignmentWorkspacePageProps): Promise<Metadata> {
  const { courseId, assignmentId } = await params;
  if (!UUID_RE.test(courseId) || !UUID_RE.test(assignmentId)) {
    return { title: "Assignment Not Found" };
  }
  const user = await requireStudent();
  const access = await verifyStudentAssignmentAccess(user.id, assignmentId);
  return {
    title: access ? `${access.assignment.title} | InsideJibon` : "Assignment Not Found",
  };
}

export default async function StudentAssignmentWorkspacePage({
  params,
}: StudentAssignmentWorkspacePageProps) {
  const { courseId, assignmentId } = await params;
  if (!UUID_RE.test(courseId) || !UUID_RE.test(assignmentId)) {
    notFound();
  }

  const user = await requireStudent();
  const [course, access] = await Promise.all([
    getLearningCourse(user.id, courseId),
    verifyStudentAssignmentAccess(user.id, assignmentId),
  ]);

  if (!course || !access || access.assignment.courseId !== courseId) {
    notFound();
  }

  const submission = await getStudentSubmission(user.id, assignmentId);

  let files: AssignmentSubmissionFile[] = [];
  if (submission) {
    const fetchedFiles = await getSubmissionFilesForStudent(user.id, submission.id);
    if (fetchedFiles) {
      files = fetchedFiles;
    }
  }

  const now = new Date();
  const isLate = isLateSubmission(access.assignment, now);
  const canResubmitValue = submission
    ? canResubmit(access.assignment, submission, now)
    : true;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <StudentAssignmentWorkspace
        assignment={access.assignment}
        courseTitle={course.title}
        submission={submission}
        files={files}
        isLateSubmission={isLate}
        canResubmit={canResubmitValue}
      />
    </main>
  );
}
