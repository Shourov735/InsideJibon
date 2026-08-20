import Link from "next/link";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherExams } from "@/services/exams";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { StatusBadge } from "@/components/teacher/status-badge";

export const metadata = {
  title: "My Exams | InsideJibon Educator",
  description: "Create, manage and publish examinations for your courses.",
};

export default async function TeacherExamsPage() {
  const teacher = await requireTeacher();
  const examsList = await getTeacherExams(teacher.id);

  const publishedCount = examsList.filter(
    (e) => e.status === "published"
  ).length;
  const draftCount = examsList.filter((e) => e.status === "draft").length;
  const archivedCount = examsList.filter((e) => e.status === "archived").length;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="exams" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">
              Examination Management
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Create, structure, and publish examinations for your courses.
            </p>
          </div>

          <Link
            href="/teacher/exams/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create New Exam</span>
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Total Exams
            </span>
            <p className="mt-1 text-2xl font-bold text-primary">{examsList.length}</p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Published
            </span>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{publishedCount}</p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Drafts
            </span>
            <p className="mt-1 text-2xl font-bold text-secondary">{draftCount}</p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Archived
            </span>
            <p className="mt-1 text-2xl font-bold text-amber-700">{archivedCount}</p>
          </div>
        </div>

        <div className="mt-8">
          {examsList.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
              <h3 className="text-lg font-bold text-on-surface">No exams created yet</h3>
              <p className="mt-1 text-sm text-secondary">
                Create your first examination and build its question paper.
              </p>
              <div className="mt-6">
                <Link
                  href="/teacher/exams/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
                >
                  <span>Create Your First Exam</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-wider text-secondary">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Exam</th>
                    <th className="px-5 py-3 font-semibold">Questions</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Created</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {examsList.map((exam) => (
                    <tr key={exam.id} className="hover:bg-surface-container-low">
                      <td className="px-5 py-4">
                        <Link
                          href={`/teacher/exams/${exam.id}`}
                          className="font-semibold text-on-surface hover:text-primary"
                        >
                          {exam.title}
                        </Link>
                        <p className="mt-0.5 max-w-md truncate text-xs text-on-surface-variant">
                          {exam.description}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-on-surface-variant">
                        {exam.questionCount}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={exam.status} />
                      </td>
                      <td className="px-5 py-4 text-on-surface-variant">
                        {exam.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/teacher/exams/${exam.id}/builder`}
                          className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                        >
                          {exam.status === "draft" ? "Build" : "View"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}