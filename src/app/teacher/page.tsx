import Link from "next/link";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourses } from "@/services/courses";
import { getTeacherExams } from "@/services/exams";
import { CourseCard } from "@/components/teacher/course-card";
import { EmptyState } from "@/components/shared/feedback";
import { getTranslator } from "@/i18n/server";
import { ExamCard } from "@/components/teacher/exams/exam-card";
import { getPendingRequestsForCourses } from "@/services/enrollments";
import { PendingRequestsList } from "@/components/shared/pending-requests-list";
import { getUpcomingSessionsForTeacher } from "@/services/classes/classes";
import { formatNumber } from "@/lib/utils";

import { Container } from "@/components/shared/ui/container";
import { SectionHeader } from "@/components/shared/ui/section-header";
import { Stat } from "@/components/shared/ui/stat";
import { Button } from "@/components/shared/ui/button";
import {
  ArrowRightIcon,
  BookIcon,
  ChartIcon,
  ClipboardIcon,
  PlusIcon,
  TrophyIcon,
  VideoIcon,
} from "@/components/shared/ui/icons";

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
    <Container className="py-6 sm:py-8" size="xl">
      {/* Hero — today's classes */}
      <section
        aria-labelledby="teacher-dashboard-hero-title"
        className="overflow-hidden rounded-3xl border border-outline-variant bg-gradient-to-br from-primary-container/30 via-surface-0 to-surface-1 p-5 sm:p-8"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-primary-container">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              {t("dashboard.teacher.hero.title")}
            </span>
            <h1
              id="teacher-dashboard-hero-title"
              className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
            >
              {t("teacher.dashboard.greeting", { name: teacher.name ?? "Educator" })}
            </h1>
            <p className="max-w-xl text-sm text-ink-500">
              {t("dashboard.teacher.hero.subtitle")}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {nextSession ? (
                <Link href={`/teacher/courses/${nextSession.courseId}/classes/${nextSession.id}`}>
                  <Button
                    variant="primary"
                    size="md"
                    leadingIcon={<VideoIcon size={14} />}
                  >
                    {t("teacher.classes.joinClass")}
                    {nextSessionDate ? (
                      <span className="ml-1 text-xs font-medium opacity-90">
                        · {nextSessionDate}
                      </span>
                    ) : null}
                  </Button>
                </Link>
              ) : (
                <Link href="/teacher/courses/new">
                  <Button
                    variant="primary"
                    size="md"
                    leadingIcon={<PlusIcon size={14} />}
                  >
                    {t("teacher.dashboard.createCourse")}
                  </Button>
                </Link>
              )}
              <Link href="/teacher/exams/new">
                <Button
                  variant="outline"
                  size="md"
                  leadingIcon={<PlusIcon size={14} />}
                >
                  {t("teacher.dashboard.createExam")}
                </Button>
              </Link>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[320px]">
            <div className="rounded-2xl border border-outline-variant bg-surface-0 p-3 text-center">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                {t("dashboard.teacher.stats.monthlyHours")}
              </dt>
              <dd className="mt-1 font-display text-xl font-bold text-ink-900">
                {formatNumber(Math.round(upcomingSessions.length * 0.75), { locale: t.locale })}
              </dd>
            </div>
            <div className="rounded-2xl border border-outline-variant bg-surface-0 p-3 text-center">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                {t("dashboard.teacher.stats.studentsTaught")}
              </dt>
              <dd className="mt-1 font-display text-xl font-bold text-[color:var(--color-success)]">
                {formatNumber(totalLessons, { locale: t.locale })}
              </dd>
            </div>
            <div className="rounded-2xl border border-outline-variant bg-surface-0 p-3 text-center">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                {t("dashboard.teacher.stats.aiUsage")}
              </dt>
              <dd className="mt-1 font-display text-xl font-bold text-ink-500">—</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Pending Enrollment Requests */}
      {pendingRequests.length > 0 ? (
        <section className="mt-6 rounded-3xl border-2 border-primary/30 bg-primary/5 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
                {t("teacher.dashboard.pendingRequestsTitle")} ({formatNumber(pendingRequests.length, { locale: t.locale })})
              </h2>
              <p className="mt-0.5 text-xs text-ink-500">
                {t("teacher.dashboard.pendingRequestsSubtitle")}
              </p>
            </div>
          </div>
          <PendingRequestsList requests={pendingRequests} />
        </section>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat
          label={t("teacher.dashboard.stats.totalCourses")}
          value={formatNumber(coursesList.length, { locale: t.locale })}
          icon={<BookIcon size={18} />}
          tone="primary"
          hint={t("teacher.dashboard.stats.coursesDesc", {
            published: publishedCourses,
            lessons: totalLessons,
          })}
        />
        <Stat
          label={t("teacher.dashboard.stats.totalExams")}
          value={formatNumber(examsList.length, { locale: t.locale })}
          icon={<TrophyIcon size={18} />}
          tone="warning"
          hint={t("teacher.dashboard.stats.examsDesc", {
            published: publishedExams,
            questions: totalQuestions,
          })}
        />
        <Stat
          label={t("teacher.dashboard.stats.published")}
          value={formatNumber(publishedCourses + publishedExams, { locale: t.locale })}
          icon={<ChartIcon size={18} />}
          tone="success"
          hint={t("teacher.dashboard.stats.publishedDesc")}
        />
        <Stat
          label={t("teacher.dashboard.stats.questionBank")}
          value={formatNumber(totalQuestions, { locale: t.locale })}
          icon={<ClipboardIcon size={18} />}
          tone="neutral"
          hint={t("teacher.dashboard.stats.questionBankDesc")}
        />
      </div>

      <section className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-outline-variant bg-surface-0 p-4 sm:p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
            {t("dashboard.teacher.recentSubmissions.title")}
          </h3>
          {recentSubmissions.length === 0 ? (
            <p className="text-sm text-ink-500">
              {t("dashboard.teacher.recentSubmissions.empty")}
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentSubmissions.map((req) => (
                <li
                  key={req.enrollment.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-outline-variant bg-surface-1 p-2"
                >
                  <span className="truncate text-ink-900">{req.studentName ?? req.studentEmail}</span>
                  <span className="truncate text-xs text-ink-500">{req.courseTitle}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-3xl border border-outline-variant bg-surface-0 p-4 sm:p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
            {t("dashboard.teacher.coursePerformance.title")}
          </h3>
          <p className="text-sm text-ink-500">
            {t("dashboard.teacher.coursePerformance.empty")}
          </p>
        </div>
        <div className="rounded-3xl border border-outline-variant bg-surface-0 p-4 sm:p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
            {t("dashboard.teacher.questions.title")}
          </h3>
          <p className="text-sm text-ink-500">
            {t("dashboard.teacher.questions.empty")}
          </p>
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader
          title={t("teacher.dashboard.recentCoursesTitle")}
          description={t("teacher.dashboard.recentCoursesSubtitle")}
          actions={
            <Link href="/teacher/courses">
              <Button variant="ghost" size="sm" trailingIcon={<ArrowRightIcon size={12} />}>
                {t("teacher.dashboard.viewAll", { count: coursesList.length })}
              </Button>
            </Link>
          }
        />

        {recentCourses.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<BookIcon size={20} />}
              title={t("teacher.dashboard.noCourses")}
              description={t("teacher.dashboard.recentCoursesSubtitle")}
              action={
                <Link href="/teacher/courses/new">
                  <Button variant="primary" size="md">
                    {t("teacher.dashboard.createCourse")}
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeader
          title={t("teacher.dashboard.recentExamsTitle")}
          description={t("teacher.dashboard.recentExamsSubtitle")}
          actions={
            <Link href="/teacher/exams">
              <Button variant="ghost" size="sm" trailingIcon={<ArrowRightIcon size={12} />}>
                {t("teacher.dashboard.viewAll", { count: examsList.length })}
              </Button>
            </Link>
          }
        />

        {recentExams.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<TrophyIcon size={20} />}
              title={t("teacher.dashboard.noExams")}
              description={t("teacher.dashboard.recentExamsSubtitle")}
              action={
                <Link href="/teacher/exams/new">
                  <Button variant="primary" size="md">
                    {t("teacher.dashboard.createExam")}
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
    </Container>
  );
}
