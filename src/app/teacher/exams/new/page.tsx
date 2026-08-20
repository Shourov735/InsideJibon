import Link from "next/link";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourses } from "@/services/courses";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { ExamForm } from "@/components/teacher/exams/exam-form";

export const metadata = {
  title: "Create Exam | InsideJibon Educator",
  description: "Create a new examination for one of your courses.",
};

export default async function NewExamPage() {
  const teacher = await requireTeacher();
  const coursesList = await getTeacherCourses(teacher.id);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="exams" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex items-center gap-2 text-xs font-medium text-secondary">
          <Link href="/teacher/exams" className="hover:text-on-surface hover:underline">
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
          <span className="text-on-surface">New Exam</span>
        </div>

        <div className="mt-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs">
          <div className="border-b border-outline-variant pb-5">
            <h1 className="text-xl font-bold tracking-tight text-on-surface">
              Create New Exam
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Associate the exam with one of your courses, then add questions
              in the exam builder.
            </p>
          </div>

          <div className="mt-6">
            {coursesList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant p-8 text-center">
                <p className="text-sm text-secondary">
                  You need at least one course before creating an exam.
                </p>
                <div className="mt-4">
                  <Link
                    href="/teacher/courses/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-xs hover:bg-primary-container hover:text-on-primary-container"
                  >
                    Create a Course
                  </Link>
                </div>
              </div>
            ) : (
              <ExamForm mode="create" courses={coursesList} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}