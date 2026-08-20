import Link from "next/link";
import { notFound } from "next/navigation";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherExamById } from "@/services/exams";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { ExamForm } from "@/components/teacher/exams/exam-form";

interface ExamEditPageProps {
  params: Promise<{ examId: string }>;
}

export const metadata = {
  title: "Edit Exam | InsideJibon Educator",
  description: "Update exam title, description, and settings.",
};

export default async function ExamEditPage({ params }: ExamEditPageProps) {
  const { examId } = await params;
  const teacher = await requireTeacher();
  const exam = await getTeacherExamById(teacher.id, examId);

  if (!exam) notFound();

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
          <Link
            href={`/teacher/exams/${exam.id}`}
            className="hover:text-on-surface hover:underline"
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
          <span className="text-on-surface">Edit</span>
        </div>

        <div className="mt-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs">
          <div className="border-b border-outline-variant pb-5">
            <h1 className="text-xl font-bold tracking-tight text-on-surface">
              Edit Exam Settings
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Update the exam&apos;s title, description, and duration. Questions
              are managed in the question builder.
            </p>
          </div>

          <div className="mt-6">
            <ExamForm mode="edit" exam={exam} />
          </div>
        </div>
      </main>
    </div>
  );
}