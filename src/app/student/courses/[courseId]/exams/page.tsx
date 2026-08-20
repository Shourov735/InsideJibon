import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireStudent } from "@/lib/permissions";
import { getStudentCourseExams } from "@/services/exams";
import { getLearningCourse } from "@/services/learning";

interface ExamsListPageProps {
  params: Promise<{ courseId: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: ExamsListPageProps): Promise<Metadata> {
  const { courseId } = await params;
  if (!UUID_RE.test(courseId)) return { title: "Course Not Found" };
  const user = await requireStudent();
  const course = await getLearningCourse(user.id, courseId);
  return { title: course ? `${course.title} — Exams` : "Course Not Found" };
}

export default async function CourseExamsPage({ params }: ExamsListPageProps) {
  const { courseId } = await params;
  const user = await requireStudent();

  const course = await getLearningCourse(user.id, courseId);
  if (!course) notFound();

  const examsList = await getStudentCourseExams(user.id, courseId);
  if (!examsList) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-2 text-xs font-medium text-secondary">
        <Link href="/student" className="hover:text-primary hover:underline">
          Dashboard
        </Link>
        <svg
          className="h-3 w-3 text-outline"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <Link
          href="/student/courses"
          className="hover:text-primary hover:underline"
        >
          My Courses
        </Link>
        <svg
          className="h-3 w-3 text-outline"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <Link
          href={`/student/courses/${courseId}/learn`}
          className="hover:text-primary hover:underline"
        >
          {course.title}
        </Link>
      </nav>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
          Exams
        </h1>
        <Link
          href={`/student/courses/${courseId}/learn`}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Back to course
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {examsList.length === 0 ? (
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
            <p className="text-sm font-medium text-on-surface">
              No exams available yet.
            </p>
            <p className="mt-1 text-sm text-secondary">
              The teacher has not published any exams for this course.
            </p>
          </div>
        ) : (
          examsList.map((exam) => (
            <Link
              key={exam.id}
              href={`/student/courses/${courseId}/exams/${exam.id}`}
              className="block rounded-xl border border-outline-variant bg-surface-container-lowest p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-semibold text-on-surface">
                    {exam.title}
                  </h2>
                  {exam.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
                      {exam.description}
                    </p>
                  )}
                </div>
                {exam.inProgressAttemptId && (
                  <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    In Progress
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-secondary">
                <span>{exam.questionCount} questions</span>
                <span>{exam.totalMarks} marks</span>
                {exam.durationMinutes != null && (
                  <span>{exam.durationMinutes} min</span>
                )}
                {exam.maxAttempts != null && (
                  <span>
                    {exam.attemptsUsed}/{exam.maxAttempts} attempts used
                  </span>
                )}
                {exam.bestPercentage != null && (
                  <span className="font-semibold text-primary">
                    Best: {exam.bestPercentage}%
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}