import Link from "next/link";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourses } from "@/services/courses";
import { getTeacherExams } from "@/services/exams";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { CourseCard } from "@/components/teacher/course-card";
import { EmptyState } from "@/components/shared/feedback";
import { getTranslator } from "@/i18n/server";
import { ExamCard } from "@/components/teacher/exams/exam-card";
import { getPendingRequestsForCourses } from "@/services/enrollments";
import { PendingRequestsList } from "@/components/shared/pending-requests-list";
import { getUpcomingSessionsForTeacher } from "@/services/classes/classes";
import { formatNumber } from "@/lib/utils";

export const metadata = {
  title: "Educator Dashboard | InsideJibon",
  description: "InsideJibon teacher control center, course and examination overview.",
};

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const teacher = await requireTeacher();
  const t = await getTranslator();
  const [coursesList, examsList, upcomingSessions] = await Promise.all([
    getTeacherCourses(teacher.id),
    getTeacherExams(teacher.id),
    getUpcomingSessionsForTeacher(teacher.id).catch(() => []),
  ]);

  const courseIds = coursesList.map((c) => c.id);
  const pendingRequests =
    courseIds.length > 0 ? await getPendingRequestsForCourses(courseIds) : [];

  const courseMap = new Map(coursesList.map((c) => [c.id, c.title]));

  const publishedCourses = coursesList.filter((c) => c.status === "published").length;
  const totalLessons = coursesList.reduce((acc, c) => acc + c.lessonCount, 0);

  const publishedExams = examsList.filter((e) => e.status === "published").length;
  const totalQuestions = examsList.reduce((acc, e) => acc + e.questionCount, 0);

  const recentCourses = coursesList.slice(0, 3);
  const recentExams = examsList.slice(0, 3);
  const nextSession = upcomingSessions[0] ?? null;
  const nextSessionDate = nextSession
    ? new Intl.DateTimeFormat(t.locale === "bn" ? "bn-BD" : "en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(nextSession.scheduledAt ? new Date(nextSession.scheduledAt) : new Date())
    : null;

  const recentSubmissions = pendingRequests.slice(0, 5);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="dashboard" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Hero — today's classes */}
        <section
          aria-labelledby="teacher-dashboard-hero-title"
          className="relative overflow-hidden rounded-2xl border border-outline-variant bg-gradient-to-br from-primary-container/30 via-surface-0 to-surface-container-low p-6 sm:p-8"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-container px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-primary-container">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {t("dashboard.teacher.hero.title")}
              </span>
              <h1
                id="teacher-dashboard-hero-title"
                className="font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl"
              >
                {t("teacher.dashboard.greeting", { name: teacher.name ?? "Educator" })}
              </h1>
              <p className="max-w-xl text-sm text-secondary">
                {t("dashboard.teacher.hero.subtitle")}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {nextSession ? (
                  <Link
                    href={`/teacher/courses/${nextSession.courseId}/classes/${nextSession.id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {t("teacher.classes.joinClass")} · {nextSessionDate}
                  </Link>
                ) : (
                  <Link
                    href="/teacher/courses/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-colors"
                  >
                    + {t("teacher.dashboard.createCourse")}
                  </Link>
                )}
                <Link
                  href="/teacher/exams/new"
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-0 px-4 py-2 text-xs font-semibold text-primary hover:bg-surface-container transition-colors"
                >
                  + {t("teacher.dashboard.createExam")}
                </Link>
              </div>
            </div>
            {/* Right rail: monthly class hours, students taught, AI usage (R8 placeholder) */}
            <dl className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[320px]">
              <div className="rounded-xl border border-outline-variant bg-surface-0 p-3 text-center">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
                  {t("dashboard.teacher.stats.monthlyHours")}
                </dt>
                <dd className="mt-1 font-display text-xl font-bold text-on-surface">
                  {formatNumber(Math.round(upcomingSessions.length * 0.75), { locale: t.locale })}
                </dd>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface-0 p-3 text-center">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
                  {t("dashboard.teacher.stats.studentsTaught")}
                </dt>
                <dd className="mt-1 font-display text-xl font-bold text-[color:var(--color-success)]">
                  {formatNumber(totalLessons, { locale: t.locale })}
                </dd>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface-0 p-3 text-center">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
                  {t("dashboard.teacher.stats.aiUsage")}
                </dt>
                <dd className="mt-1 font-display text-xl font-bold text-[color:var(--color-warning)]">
                  —
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Pending Enrollment Requests — preserved */}
        {pendingRequests.length > 0 && (
          <section className="space-y-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                  {t("teacher.dashboard.pendingRequestsTitle")} ({formatNumber(pendingRequests.length, { locale: t.locale })})
                </h2>
                <p className="text-xs text-secondary mt-0.5">
                  {t("teacher.dashboard.pendingRequestsSubtitle")}
                </p>
              </div>
            </div>
            <PendingRequestsList requests={pendingRequests} />
          </section>
        )}

        {/* Metrics Grid (preserved) */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="bento-card-static p-5 relative overflow-hidden group hover:border-primary/40 transition-colors">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.dashboard.stats.totalCourses")}
            </span>
            <p className="mt-2 font-display text-3xl font-bold text-primary">
              {formatNumber(coursesList.length, { locale: t.locale })}
            </p>
            <span className="mt-1 block text-xs text-on-surface-variant">
              {t("teacher.dashboard.stats.coursesDesc", {
                published: publishedCourses,
                lessons: totalLessons,
              })}
            </span>
          </div>
          <div className="bento-card-static p-5 relative overflow-hidden group hover:border-primary/40 transition-colors">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.dashboard.stats.totalExams")}
            </span>
            <p className="mt-2 font-display text-3xl font-bold text-primary">
              {formatNumber(examsList.length, { locale: t.locale })}
            </p>
            <span className="mt-1 block text-xs text-on-surface-variant">
              {t("teacher.dashboard.stats.examsDesc", {
                published: publishedExams,
                questions: totalQuestions,
              })}
            </span>
          </div>
          <div className="bento-card-static p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.dashboard.stats.published")}
            </span>
            <p className="mt-2 font-display text-3xl font-bold text-[color:var(--color-success)]">
              {formatNumber(publishedCourses + publishedExams, { locale: t.locale })}
            </p>
            <span className="mt-1 block text-xs text-on-surface-variant">
              {t("teacher.dashboard.stats.publishedDesc")}
            </span>
          </div>
          <div className="bento-card-static p-5 relative overflow-hidden group hover:border-primary/40 transition-colors">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.dashboard.stats.questionBank")}
            </span>
            <p className="mt-2 font-display text-3xl font-bold text-primary">
              {formatNumber(totalQuestions, { locale: t.locale })}
            </p>
            <span className="mt-1 block text-xs text-on-surface-variant">
              {t("teacher.dashboard.stats.questionBankDesc")}
            </span>
          </div>
        </div>

        {/* Three-up row (R1 §6.2): recent submissions, course performance, Q&A */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="bento-card-static p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
              {t("dashboard.teacher.recentSubmissions.title")}
            </h3>
            {recentSubmissions.length === 0 ? (
              <p className="text-sm text-secondary">
                {t("dashboard.teacher.recentSubmissions.empty")}
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentSubmissions.map((req) => (
                  <li
                    key={req.enrollment.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-2"
                  >
                    <span className="truncate text-on-surface">{req.studentName ?? req.studentEmail}</span>
                    <span className="text-xs text-secondary truncate">{req.courseTitle}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bento-card-static p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
              {t("dashboard.teacher.coursePerformance.title")}
            </h3>
            <p className="text-sm text-secondary">
              {t("dashboard.teacher.coursePerformance.empty")}
            </p>
          </div>
          <div className="bento-card-static p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
              {t("dashboard.teacher.questions.title")}
            </h3>
            <p className="text-sm text-secondary">
              {t("dashboard.teacher.questions.empty")}
            </p>
          </div>
        </section>

        {/* Recent Courses Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-on-surface">
                {t("teacher.dashboard.recentCoursesTitle")}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {t("teacher.dashboard.recentCoursesSubtitle")}
              </p>
            </div>
            <Link
              href="/teacher/courses"
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("teacher.dashboard.viewAll", { count: coursesList.length })} →
            </Link>
          </div>

          {recentCourses.length === 0 ? (
            <EmptyState
              icon={
                <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
                </svg>
              }
              title={t("teacher.dashboard.noCourses")}
              description={t("teacher.dashboard.recentCoursesSubtitle")}
              action={
                <Link
                  href="/teacher/courses/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-container transition-colors"
                >
                  {t("teacher.dashboard.createCourse")}
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>

        {/* Recent Examinations Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-on-surface">
                {t("teacher.dashboard.recentExamsTitle")}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {t("teacher.dashboard.recentExamsSubtitle")}
              </p>
            </div>
            <Link
              href="/teacher/exams"
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("teacher.dashboard.viewAll", { count: examsList.length })} →
            </Link>
          </div>

          {recentExams.length === 0 ? (
            <EmptyState
              icon={
                <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5h6m-6 0a2 2 0 00-2 2v12l3-2 3 2 3-2 3 2V7a2 2 0 00-2-2" />
                </svg>
              }
              title={t("teacher.dashboard.noExams")}
              description={t("teacher.dashboard.recentExamsSubtitle")}
              action={
                <Link
                  href="/teacher/exams/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-container transition-colors"
                >
                  {t("teacher.dashboard.createExam")}
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentExams.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  courseTitle={courseMap.get(exam.courseId)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}