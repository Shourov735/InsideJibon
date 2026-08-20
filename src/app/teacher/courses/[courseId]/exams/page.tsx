import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseById } from "@/services/courses";
import { getTeacherExams } from "@/services/exams";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { ExamCard } from "@/components/teacher/exams/exam-card";

interface TeacherCourseExamsPageProps {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({
  params,
}: TeacherCourseExamsPageProps): Promise<Metadata> {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const course = await getTeacherCourseById(teacher.id, courseId);
  return {
    title: course ? `${course.title} — Examinations | Educator` : "Course Not Found",
  };
}

export default async function TeacherCourseExamsPage({
  params,
}: TeacherCourseExamsPageProps) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const course = await getTeacherCourseById(teacher.id, courseId);

  if (!course) notFound();

  const examsList = await getTeacherExams(teacher.id, course.id);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="exams" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-medium text-secondary">
          <Link href="/teacher/courses" className="hover:text-primary transition-colors">
            Courses
          </Link>
          <svg className="h-3 w-3 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <Link href={`/teacher/courses/${course.id}`} className="hover:text-primary transition-colors truncate max-w-xs">
            {course.title}
          </Link>
          <svg className="h-3 w-3 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-on-surface font-semibold">Examinations</span>
        </nav>

        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                কোর্স মূল্যায়ন • Assessment Portal
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              {course.title} — Examinations
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant max-w-2xl">
              Create, configure, and manage examinations and quizzes for students enrolled in this course.
            </p>
          </div>

          <Link
            href={`/teacher/exams/new?courseId=${course.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-xs hover:bg-primary-container hover:text-on-primary-container transition-colors shrink-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Exam for Course</span>
          </Link>
        </div>

        {/* Exams Grid */}
        {examsList.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center shadow-xs space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-on-surface">No exams created for this course yet</h3>
            <p className="mx-auto max-w-md text-xs text-secondary">
              Configure question papers with multiple choice questions, set time limits, and publish when ready for student attempts.
            </p>
            <div className="pt-2">
              <Link
                href={`/teacher/exams/new?courseId=${course.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-container transition-colors"
              >
                <span>+ Create Your First Exam for {course.title}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {examsList.map((exam) => (
              <ExamCard key={exam.id} exam={exam} courseTitle={course.title} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
