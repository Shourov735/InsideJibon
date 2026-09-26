import Link from "next/link";

import { requireStudent } from "@/lib/permissions";
import { getStudentDashboard } from "@/services/learning";
import { getPendingEnrollmentsForStudent } from "@/services/enrollments";
import { getDiscoverCoursesForStudent } from "@/services/courses/public";
import { listPublishedBundleCourseIds } from "@/services/payments";
import { getUpcomingSessionsForStudent } from "@/services/classes/classes";
import { getUserNotifications } from "@/services/notifications";
import { UpcomingSessionsList } from "@/components/student/classes/upcoming-sessions-list";
import { StudentCourseCard } from "@/components/student/student-course-card";
import { PublicCourseCard } from "@/components/public/course-card";
import { EmptyState } from "@/components/shared/feedback";
import { StreakXpCard } from "@/components/student/gamification/StreakXpCard";
import { TutorDashboardCard } from "@/components/student/tutor/tutor-card";
import { getTranslator } from "@/i18n/server";
import { getWhatsAppEnrollmentUrl } from "@/lib/whatsapp";
import { formatNumber } from "@/lib/utils";

import { Container } from "@/components/shared/ui/container";
import {
  Stat,
  PageHeader,
} from "@/components/shared/ui";
import { Badge } from "@/components/shared/ui/badge";
import {
  ArrowRightIcon,
  BookIcon,
  CalendarIcon,
  ChartIcon,
  PlayIcon,
  TrophyIcon,
  VideoIcon,
} from "@/components/shared/ui/icons";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await requireStudent();
  const t = await getTranslator();

  const [courses, pendingEnrollments, discoverCourses, upcomingSessions, notifications, bundleCourseIds] = await Promise.all([
    getStudentDashboard(user.id),
    getPendingEnrollmentsForStudent(user.id),
    getDiscoverCoursesForStudent(user.id, 4),
    getUpcomingSessionsForStudent(user.id),
    getUserNotifications(user.id),
    listPublishedBundleCourseIds(),
  ]);
  const bundleCourseIdSet = new Set(bundleCourseIds);

  const sortedByAccess = [...courses].sort((a, b) => {
    const ta = a.lastLesson?.lastAccessedAt?.getTime() ?? 0;
    const tb = b.lastLesson?.lastAccessedAt?.getTime() ?? 0;
    return tb - ta;
  });

  const continueCourse = sortedByAccess[0] ?? null;
  const continueHref = continueCourse?.lastLesson
    ? `/student/courses/${continueCourse.courseId}/learn?lesson=${continueCourse.lastLesson.id}`
    : continueCourse
      ? `/student/courses/${continueCourse.courseId}/learn`
      : null;

  const completedCount = courses.filter((c) => c.completedAt).length;
  const averageProgress = courses.length === 0
    ? 0
    : Math.round(courses.reduce((acc, c) => acc + c.progress.percent, 0) / courses.length);

  const recentNotifications = notifications.slice(0, 3);
  const nextSession = upcomingSessions[0] ?? null;

  const firstName = user.name?.split(" ")[0];

  return (
    <Container className="py-6 sm:py-8" size="xl">
      {/* Greeting header */}
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t("dashboard.student.hero.badge")}
          </span>
        }
        title={t("dashboard.student.hero.title", {
          name: firstName || t("student.dashboard.learnerFallback"),
        })}
        description={t("dashboard.student.hero.subtitle")}
        actions={
          continueHref ? (
            <Link
              href={continueHref}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary/90"
            >
              <PlayIcon size={16} />
              {t("student.dashboard.continue")}
              <ArrowRightIcon size={14} />
            </Link>
          ) : (
            <Link
              href="/courses"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary/90"
            >
              {t("student.dashboard.browseCourses")}
              <ArrowRightIcon size={14} />
            </Link>
          )
        }
      />

      {/* Stat row */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-4 sm:gap-4">
        <Stat
          label={t("student.dashboard.stats.enrolled")}
          value={formatNumber(courses.length, { locale: t.locale })}
          icon={<BookIcon size={18} />}
          tone="primary"
        />
        <Stat
          label={t("student.dashboard.stats.completed")}
          value={formatNumber(completedCount, { locale: t.locale })}
          icon={<TrophyIcon size={18} />}
          tone="success"
        />
        <Stat
          label={t("student.dashboard.stats.progress")}
          value={`${formatNumber(averageProgress, { locale: t.locale })}%`}
          icon={<ChartIcon size={18} />}
          tone="warning"
        />
        <Stat
          label={t("dashboard.student.upcoming.title")}
          value={formatNumber(upcomingSessions.length, { locale: t.locale })}
          icon={<CalendarIcon size={18} />}
          tone="neutral"
        />
      </div>

      {/* Hero continue card */}
      {continueCourse ? (
        <section className="mt-6 sm:mt-8">
          <div className="overflow-hidden rounded-3xl border border-outline-variant bg-surface-0 shadow-academic transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5">
            <div className="flex flex-col sm:flex-row">
              {/* Left thumbnail / media */}
              {continueCourse.thumbnailUrl ? (
                <div className="relative h-44 w-full shrink-0 overflow-hidden bg-surface-2 sm:h-auto sm:w-2/5 md:w-1/3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={continueCourse.thumbnailUrl}
                    alt={continueCourse.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden" />
                  <div className="absolute bottom-3 left-3 sm:top-3 sm:left-3 sm:bottom-auto">
                    <Badge tone="primary" size="xs" className="bg-surface-0/90 text-primary font-bold backdrop-blur-xs">
                      {t("common.status.inProgress")}
                    </Badge>
                  </div>
                </div>
              ) : null}

              {/* Right content */}
              <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                      {t("dashboard.student.continue.title")}
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      {continueCourse.progress.percent}%
                    </span>
                  </div>
                  <h2 className="mt-1.5 font-display text-xl font-bold tracking-tight text-ink-900 sm:text-2xl line-clamp-2">
                    {continueCourse.title}
                  </h2>
                  {continueCourse.lastLesson ? (
                    <p className="mt-1 text-sm text-ink-500 line-clamp-1">
                      <span className="font-medium text-ink-700">Next lesson:</span> {continueCourse.lastLesson.title}
                    </p>
                  ) : null}
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink-500">
                    <span>
                      {t("student.learn.lessonsProgress", {
                        completed: continueCourse.progress.completed,
                        total: continueCourse.progress.total,
                      })}
                    </span>
                    <span>{continueCourse.progress.percent}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${continueCourse.progress.percent}%` }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      href={continueHref ?? "/student/courses"}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-on-primary shadow-xs hover:bg-primary/90 transition-colors w-full sm:w-auto"
                    >
                      <PlayIcon size={16} />
                      {continueCourse.lastLesson ? t("student.dashboard.continue") : "Open Course"}
                    </Link>
                    <Link
                      href={`/student/courses/${continueCourse.courseId}/learn`}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-outline-variant bg-surface-0 px-4 text-sm font-medium text-ink-700 hover:bg-surface-1 transition-colors w-full sm:w-auto"
                    >
                      {t("marketing.courseDetail.curriculum")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Streak / XP / AI tutor */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 lg:grid-cols-2">
        <StreakXpCard userId={user.id} />
        <TutorDashboardCard
          courseId={continueCourse?.courseId ?? null}
          lessonId={continueCourse?.lastLesson?.id ?? null}
        />
      </div>

      {/* Continue learning grid */}
      <section className="mt-8 space-y-4 sm:mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink-900">
            {t("dashboard.student.continue.title")}
          </h2>
          <Link
            href="/student/courses"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            {t("dashboard.student.continue.viewAll")} ({formatNumber(courses.length, { locale: t.locale })})
            <ArrowRightIcon size={12} />
          </Link>
        </div>
        {courses.length === 0 ? (
          <EmptyState
            icon={<BookIcon size={20} />}
            title={t("dashboard.student.noContinue")}
            description={t("student.dashboard.noEnrollments")}
            action={
              <Link
                href="/courses"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary/90"
              >
                {t("student.dashboard.browseCourses")}
                <ArrowRightIcon size={14} />
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 4).map((course) => (
              <StudentCourseCard key={course.courseId} course={course} />
            ))}
          </div>
        )}
      </section>

      {/* Three-up */}
      <section className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 lg:grid-cols-3">
        <div className="rounded-3xl border border-outline-variant bg-surface-0 p-4 sm:p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
            {t("dashboard.student.recentGrades.title")}
          </h3>
          <p className="text-sm text-ink-500">
            {t("dashboard.student.recentGrades.empty")}
          </p>
        </div>
        <div className="rounded-3xl border border-outline-variant bg-surface-0 p-4 sm:p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
            {t("dashboard.student.upcoming.title")}
          </h3>
          {nextSession ? (
            <UpcomingSessionsList sessions={upcomingSessions.slice(0, 3)} />
          ) : (
            <p className="text-sm text-ink-500">{t("dashboard.student.upcoming.empty")}</p>
          )}
        </div>
        <div className="rounded-3xl border border-outline-variant bg-surface-0 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              {t("student.dashboard.recentNotifications")}
            </h3>
            <Link
              href="/student/notifications"
              className="text-[10px] font-semibold text-primary"
            >
              {t("dashboard.student.continue.viewAll")}
            </Link>
          </div>
          {recentNotifications.length === 0 ? (
            <p className="text-sm text-ink-500">{t("student.dashboard.noRecentNotifications")}</p>
          ) : (
            <ul className="space-y-2">
              {recentNotifications.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.link || "/student/notifications"}
                    className="flex items-start gap-2 rounded-xl p-2 transition-colors hover:bg-surface-1"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        n.isRead ? "bg-outline" : "bg-primary"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xs font-semibold ${n.isRead ? "text-ink-500" : "text-ink-900"}`}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-500 line-clamp-1">
                        {n.body}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Pending enrollments */}
      {pendingEnrollments.length > 0 ? (
        <section className="mt-8 space-y-4 rounded-3xl border-2 border-amber-500/30 bg-amber-500/5 p-5 sm:mt-10 sm:p-6">
          <div>
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              {t("student.dashboard.pendingSectionTitle")} ({formatNumber(pendingEnrollments.length, { locale: t.locale })})
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {t("student.dashboard.pendingSectionSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {pendingEnrollments.map((req) => {
              const whatsAppUrl = getWhatsAppEnrollmentUrl(req.courseTitle, t.locale as "en" | "bn");
              const formattedDate = new Intl.DateTimeFormat(t.locale === "bn" ? "bn-BD" : "en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(req.enrolledAt));

              return (
                <div
                  key={req.id}
                  className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-0 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {req.courseThumbnailUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={req.courseThumbnailUrl}
                        alt={req.courseTitle}
                        className="h-12 w-16 shrink-0 rounded-lg border border-outline-variant object-cover sm:h-14 sm:w-20"
                      />
                    ) : (
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-primary-container/15 text-primary sm:h-14 sm:w-20">
                        <BookIcon size={20} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="line-clamp-1 font-display text-sm font-semibold text-ink-900">
                        <Link href={`/courses/${req.courseSlug}`} className="hover:text-primary">
                          {req.courseTitle}
                        </Link>
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {req.teacherName ?? "InsideJibon"} · {t("student.dashboard.pendingRequestedAt", { date: formattedDate })}
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                    <a
                      href={whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-xs font-semibold text-white hover:bg-[#20bd5a]"
                    >
                      <VideoIcon size={12} />
                      <span>{t("student.dashboard.chatOnWhatsApp")}</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Discover */}
      {discoverCourses.length > 0 ? (
        <section className="mt-8 space-y-4 pt-2 sm:mt-10">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight text-ink-900">
                {t("student.dashboard.discoverSectionTitle")}
              </h3>
              <p className="mt-0.5 text-xs text-ink-500">
                {t("student.dashboard.discoverSectionSubtitle")}
              </p>
            </div>
            <Link
              href="/courses"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              {t("student.dashboard.viewAll")}
              <ArrowRightIcon size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {discoverCourses.map((c) => (
              <PublicCourseCard
                key={c.id}
                course={c}
                inBundle={bundleCourseIdSet.has(c.id)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
