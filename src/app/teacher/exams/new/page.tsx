import Link from "next/link";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourses } from "@/services/courses";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { ExamForm } from "@/components/teacher/exams/exam-form";

export const metadata = {
  title: "Create Exam | InsideJibon Educator",
  description: "Create a new examination for one of your courses.",
};

interface NewExamPageProps {
  searchParams: Promise<{ courseId?: string }>;
}

export default async function NewExamPage({ searchParams }: NewExamPageProps) {
  const { courseId } = await searchParams;
  const teacher = await requireTeacher();
  const coursesList = await getTeacherCourses(teacher.id);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="exams" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-medium text-secondary">
          <Link href="/teacher/exams" className="hover:text-primary transition-colors">
            Exams
          </Link>
          <svg
            className="h-3 w-3 text-outline"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-on-surface font-semibold">New Exam</span>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs">
          <div className="border-b border-outline-variant pb-5">
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                নতুন পরীক্ষা
              </span>
              <span className="text-xs text-secondary">• Assessment Setup</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-on-surface">
              Create New Examination
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Associate this assessment with one of your courses, provide instructions, then add questions in the interactive Exam Builder.
            </p>
          </div>

          <div className="mt-6">
            {coursesList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant p-8 text-center bg-surface-container-low">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="mt-3 text-base font-bold text-on-surface">Course Required</h3>
                <p className="mt-1 text-sm text-secondary max-w-sm mx-auto">
                  Every examination must be associated with a course. Please create your first course before setting up an exam.
                </p>
                <div className="mt-5">
                  <Link
                    href="/teacher/courses/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-xs hover:bg-primary-container transition-colors"
                  >
                    <span>Create a Course First</span>
                  </Link>
                </div>
              </div>
            ) : (
              <ExamForm
                mode="create"
                courses={coursesList}
                initialCourseId={courseId}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}