import Link from "next/link";
import { notFound } from "next/navigation";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherExamById } from "@/services/exams";
import { getTeacherCourseById } from "@/services/courses";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { ExamForm } from "@/components/teacher/exams/exam-form";

interface ExamEditPageProps {
  params: Promise<{ examId: string }>;
}

export async function generateMetadata({ params }: ExamEditPageProps) {
  const { examId } = await params;
  const teacher = await requireTeacher();
  const exam = await getTeacherExamById(teacher.id, examId);

  if (!exam) return { title: "Edit Exam | Not Found" };

  return {
    title: `Edit: ${exam.title} | InsideJibon Educator`,
    description: `Update settings for ${exam.title}`,
  };
}

export default async function ExamEditPage({ params }: ExamEditPageProps) {
  const { examId } = await params;
  const teacher = await requireTeacher();
  const exam = await getTeacherExamById(teacher.id, examId);

  if (!exam) notFound();

  const course = await getTeacherCourseById(teacher.id, exam.courseId);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="exams" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 space-y-6">
        {/* Breadcrumbs */}
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
          <Link
            href={`/teacher/exams/${exam.id}`}
            className="hover:text-primary transition-colors truncate max-w-xs"
          >
            {exam.title}
          </Link>
          <svg
            className="h-3 w-3 text-outline"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-on-surface font-semibold">Edit Settings</span>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs">
          <div className="border-b border-outline-variant pb-5">
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                সেটিংস পরিবর্তন
              </span>
              <span className="text-xs text-secondary">• Exam Metadata</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-on-surface">
              Edit Examination Settings
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Update title, instructions, and duration. Questions and options are managed in the interactive Question Builder.
            </p>
          </div>

          <div className="mt-6">
            <ExamForm mode="edit" exam={exam} associatedCourse={course} />
          </div>
        </div>
      </main>
    </div>
  );
}