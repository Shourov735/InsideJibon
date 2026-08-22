import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseById } from "@/services/courses";
import { getCourseAnalytics } from "@/services/analytics";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { getTranslator } from "@/i18n/server";

interface AnalyticsPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const teacher = await requireTeacher();
  const { courseId } = await params;
  const t = await getTranslator();

  const course = await getTeacherCourseById(teacher.id, courseId);
  if (!course) return notFound();

  const analytics = await getCourseAnalytics(teacher.id, courseId);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="courses" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header & Breadcrumb */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/teacher/courses/${courseId}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest text-secondary hover:bg-surface-container hover:text-primary transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  Course Analytics
                </span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
                {course.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/export/courses/${courseId}/roster`}
              download
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-xs font-bold text-primary shadow-2xs hover:bg-surface-container-low transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("teacher.analytics.downloadRoster")}
            </a>
          </div>
        </div>

        {/* 4-Metric Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bento-card-static p-5 relative overflow-hidden group hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-secondary">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="text-xs font-semibold uppercase tracking-wider">{t("teacher.analytics.totalEnrolled")}</h3>
            </div>
            <p className="font-display text-3xl font-bold text-primary">{analytics.totalStudents}</p>
            <span className="mt-1 block text-xs text-secondary">Active enrolled learners</span>
          </div>

          <div className="bento-card-static p-5 relative overflow-hidden group hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-secondary">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xs font-semibold uppercase tracking-wider">{t("teacher.analytics.submitted")}</h3>
            </div>
            <p className="font-display text-3xl font-bold text-on-surface">{analytics.totalSubmissions}</p>
            <span className="mt-1 block text-xs text-secondary">Total assignment submissions</span>
          </div>

          <div className="bento-card-static p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-secondary">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xs font-semibold uppercase tracking-wider">{t("teacher.analytics.graded")}</h3>
            </div>
            <p className="font-display text-3xl font-bold text-emerald-600">{analytics.gradedSubmissions}</p>
            <span className="mt-1 block text-xs text-secondary">Graded with feedback</span>
          </div>

          <div className="bento-card-static p-5 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-secondary">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xs font-semibold uppercase tracking-wider">Pending Review</h3>
            </div>
            <p className="font-display text-3xl font-bold text-amber-600">{analytics.pendingSubmissions}</p>
            <span className="mt-1 block text-xs text-secondary">Awaiting teacher grading</span>
          </div>
        </div>
      </main>
    </div>
  );
}
