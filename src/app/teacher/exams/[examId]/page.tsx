import Link from "next/link";
import { notFound } from "next/navigation";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherExamWithQuestions, validateExamForPublishing } from "@/services/exams";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { StatusBadge } from "@/components/teacher/status-badge";
import { ExamLifecycleActions } from "@/components/teacher/exams/exam-lifecycle-actions";

interface ExamDetailPageProps {
  params: Promise<{ examId: string }>;
}

export async function generateMetadata({ params }: ExamDetailPageProps) {
  const { examId } = await params;
  const teacher = await requireTeacher();
  const exam = await getTeacherExamWithQuestions(teacher.id, examId);

  if (!exam) return { title: "Exam | Not Found" };

  return {
    title: `${exam.title} | InsideJibon Educator`,
    description: exam.description ?? `Examination for course ${exam.courseId}`,
  };
}

export default async function ExamDetailPage({ params }: ExamDetailPageProps) {
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
          <span className="text-on-surface">{exam.title}</span>
        </div>

        <div className="mt-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-on-surface">
                  {exam.title}
                </h1>
                <StatusBadge status={exam.status} />
              </div>
              <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
                {exam.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-secondary">
                <span>
                  {exam.questions.length}{" "}
                  {exam.questions.length === 1 ? "question" : "questions"}
                </span>
                <span>Total marks: {exam.totalMarks}</span>
                {exam.durationMinutes && (
                  <span>Duration: {exam.durationMinutes} minutes</span>
                )}
                {exam.publishedAt && (
                  <span>
                    Published: {exam.publishedAt.toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <Link
              href={`/teacher/exams/${exam.id}/builder`}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
            >
              {exam.status === "draft" ? "Open Question Builder" : "View Questions"}
            </Link>
          </div>

          <div className="mt-6 border-t border-outline-variant pt-5">
            <ExamLifecycleActions
              examId={exam.id}
              status={exam.status}
              publishCheck={publishCheck}
            />
          </div>
        </div>

        {/* Teacher-side preview */}
        <div className="mt-6 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-secondary">
            Exam Preview
          </h2>
          {exam.questions.length === 0 ? (
            <p className="mt-3 text-sm text-on-surface-variant">
              No questions yet — open the question builder to add some.
            </p>
          ) : (
            <ol className="mt-4 space-y-4">
              {exam.questions.map((question) => (
                <li key={question.id} className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-on-surface">
                      {question.position}. {question.questionText}
                    </p>
                    <span className="shrink-0 text-xs font-semibold text-secondary">
                      {question.marks} marks
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {question.options.map((option) => (
                      <li
                        key={option.id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                          option.isCorrect
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                            : "border-outline-variant bg-surface-container-lowest text-on-surface-variant"
                        }`}
                      >
                        <span className="font-semibold">
                          {String.fromCharCode(64 + option.position)}.
                        </span>
                        {option.optionText}
                        {option.isCorrect && (
                          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            Correct answer
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Link
            href={`/teacher/exams/${exam.id}/edit`}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            Edit Exam Settings
          </Link>
        </div>
      </main>
    </div>
  );
}