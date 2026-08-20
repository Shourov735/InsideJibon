import Link from "next/link";
import { notFound } from "next/navigation";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherExamWithQuestions, validateExamForPublishing } from "@/services/exams";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { StatusBadge } from "@/components/teacher/status-badge";
import { QuestionBuilder } from "@/components/teacher/exams/question-builder";

interface ExamBuilderPageProps {
  params: Promise<{ examId: string }>;
}

export async function generateMetadata({ params }: ExamBuilderPageProps) {
  const { examId } = await params;
  const teacher = await requireTeacher();
  const exam = await getTeacherExamWithQuestions(teacher.id, examId);

  if (!exam) return { title: "Exam Builder | Not Found" };

  return {
    title: `Builder: ${exam.title} | InsideJibon`,
    description: `Question builder for ${exam.title}`,
  };
}

export default async function ExamBuilderPage({ params }: ExamBuilderPageProps) {
  const { examId } = await params;
  const teacher = await requireTeacher();
  const exam = await getTeacherExamWithQuestions(teacher.id, examId);

  if (!exam) notFound();

  const publishCheck = await validateExamForPublishing(teacher.id, exam.id);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="exams" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
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
          <span className="text-on-surface">Question Builder</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-on-surface">
                {exam.title}
              </h1>
              <StatusBadge status={exam.status} />
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">
              {exam.questions.length} questions · {exam.totalMarks} total marks
              {exam.durationMinutes ? ` · ${exam.durationMinutes} minutes` : ""}
            </p>
            {publishCheck.canPublish && exam.status === "draft" && (
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                This exam is ready to publish.
              </p>
            )}
          </div>
          <Link
            href={`/teacher/exams/${exam.id}`}
            className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            View & Publish
          </Link>
        </div>

        {exam.status !== "draft" && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This exam is {exam.status}. Structural changes (questions, options,
            reordering) are frozen — unpublish it from the exam page to edit
            again.
          </div>
        )}

        <div className="mt-6">
          <QuestionBuilder exam={exam} />
        </div>
      </main>
    </div>
  );
}