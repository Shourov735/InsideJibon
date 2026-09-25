import Link from "next/link";

import { requireStudent } from "@/lib/permissions";
import { getStudentDashboard } from "@/services/learning";
import { getPendingEnrollmentsForStudent } from "@/services/enrollments";
import { getDiscoverCoursesForStudent } from "@/services/courses/public";
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

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await requireStudent();
  const t = await getTranslator();

  const [courses, pendingEnrollments, discoverCourses, upcomingSessions, notifications] = await Promise.all([
    getStudentDashboard(user.id),
    getPendingEnrollmentsForStudent(user.id),
    getDiscoverCoursesForStudent(user.id, 4),
    getUpcomingSessionsForStudent(user.id),
    getUserNotifications(user.id),
  ]);

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

  // Today's routine = next live session (if any), plus next assignment/exam
  // deadlines. R1 §6.1 hero — first cut focuses on next live class + a CTA
  // to continue. R5 will fill the streak/XP/league right rail.
  const nextSession = upcomingSessions[0] ?? null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Hero — today's routine */}
      <section
        aria-labelledby="dashboard-hero-title"
        className="relative overflow-hidden rounded-2xl border border-outline-variant bg-gradient-to-br from-primary-container/30 via-surface-0 to-surface-container-low p-6 sm:p-8"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-container px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-primary-container">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {t("dashboard.student.hero.badge")}
            </span>
            <h1
              id="dashboard-hero-title"
              className="font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl"
            >
              {t("dashboard.student.hero.title", {
                name: user.name?.split(" ")[0] || t("student.dashboard.learnerFallback"),
              })}
            </h1>
            <p className="max-w-xl text-sm text-secondary">
              {t("dashboard.student.hero.subtitle")}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {continueHref ? (
                <Link
                  href={continueHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                  {t("student.dashboard.continue")}
                </Link>
              ) : (
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-colors"
                >
                  {t("student.dashboard.browseCourses")}
                </Link>
              )}
              {nextSession ? (
                <Link
                  href={`/student/classes/${nextSession.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-0 px-4 py-2 text-xs font-semibold text-primary hover:bg-surface-container transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {t("student.classes.joinClass")}
                </Link>
              ) : null}
            </div>
          </div>
          {/* Right side: today's stat trio */}
          <dl className="grid grid-cols-3 gap-2 sm:gap-3 sm:min-w-[260px]">
            <div className="rounded-xl border border-outline-variant bg-surface-0 p-3 text-center">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
                {t("student.dashboard.stats.enrolled")}
              </dt>
              <dd className="mt-1 font-display text-xl font-bold text-on-surface">
                {formatNumber(courses.length, { locale: t.locale })}
              </dd>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-0 p-3 text-center">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
                {t("student.dashboard.stats.completed")}
              </dt>
              <dd className="mt-1 font-display text-xl font-bold text-[color:var(--color-success)]">
                {formatNumber(completedCount, { locale: t.locale })}
              </dd>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-0 p-3 text-center">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
                {t("student.dashboard.stats.progress")}
              </dt>
              <dd className="mt-1 font-display text-xl font-bold text-[color:var(--color-warning)]">
                {formatNumber(averageProgress, { locale: t.locale })}%
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* R5 — Streak / XP / League right rail */}
      <section className="mt-6">
        <StreakXpCard userId={user.id} />
      </section>

      {/* R8 — AI tutor entry point */}
      <section className="mt-4">
        <TutorDashboardCard
          courseId={continueCourse?.courseId ?? null}
          lessonId={continueCourse?.lastLesson?.id ?? null}
        />
      </section>

      {/* Continue learning */}
      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-tight text-on-surface">
            {t("dashboard.student.continue.title")}
          </h2>
          <Link
            href="/student/courses"
            className="text-xs font-semibold text-primary hover:underline"
          >
            {t("dashboard.student.continue.viewAll")} ({formatNumber(courses.length, { locale: t.locale })}) →
          </Link>
        </div>
        {courses.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
              </svg>
            }
            title={t("dashboard.student.noContinue")}
            description={t("student.dashboard.noEnrollments")}
            action={
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-container transition-colors"
              >
                {t("student.dashboard.browseCourses")}
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

      {/* Three-up: pending, recent grades (placeholder until R4/R5), upcoming */}
      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="bento-card-static p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
            {t("dashboard.student.recentGrades.title")}
          </h3>
          <p className="text-sm text-secondary">
            {t("dashboard.student.recentGrades.empty")}
          </p>
        </div>
        <div className="bento-card-static p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
            {t("dashboard.student.upcoming.title")}
          </h3>
          {nextSession ? (
            <UpcomingSessionsList sessions={upcomingSessions.slice(0, 3)} />
          ) : (
            <p className="text-sm text-secondary">
              {t("dashboard.student.upcoming.empty")}
            </p>
          )}
        </div>
        <div className="bento-card-static p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
            {t("student.dashboard.recentNotifications")}
          </h3>
          {recentNotifications.length === 0 ? (
            <p className="text-sm text-secondary">
              {t("student.dashboard.noRecentNotifications")}
            </p>
          ) : (
            <ul className="space-y-2">
              {recentNotifications.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.link || "/student/notifications"}
                    className="flex items-start gap-2 rounded-lg p-1.5 hover:bg-surface-container transition-colors"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        n.isRead ? "bg-outline" : "bg-primary"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xs font-semibold ${n.isRead ? "text-secondary" : "text-on-surface"}`}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-secondary line-clamp-1">
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

      {/* Pending enrollment requests — preserved from R0 */}
      {pendingEnrollments.length > 0 && (
        <section className="mt-8 space-y-4 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-on-surface flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                {t("student.dashboard.pendingSectionTitle")} ({formatNumber(pendingEnrollments.length, { locale: t.locale })})
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                {t("student.dashboard.pendingSectionSubtitle")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
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
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {req.courseThumbnailUrl ? (
                      <img
                        src={req.courseThumbnailUrl}
                        alt={req.courseTitle}
                        className="h-12 w-16 sm:h-14 sm:w-20 rounded-lg object-cover border border-outline-variant shrink-0"
                      />
                    ) : (
                      <div className="flex h-12 w-16 sm:h-14 sm:w-20 items-center justify-center rounded-lg bg-primary-container/15 text-primary shrink-0 border border-outline-variant">
                        <svg className="h-6 w-6 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
                        </svg>
                      </div>
                    )}

                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-bold text-on-surface line-clamp-1">
                        <Link href={`/courses/${req.courseSlug}`} className="hover:text-primary transition-colors">
                          {req.courseTitle}
                        </Link>
                      </h3>
                      <p className="text-xs text-secondary truncate mt-0.5">
                        {req.teacherName ?? "InsideJibon"} · {t("student.dashboard.pendingRequestedAt", { date: formattedDate })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                    <a
                      href={whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white px-3.5 py-2 text-xs font-bold shadow-2xs transition-colors"
                    >
                      <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.976.58 1.992.921 3.149.921l.002-.001c3.182 0 5.768-2.587 5.769-5.766.001-3.182-2.585-5.769-5.771-5.769z" />
                      </svg>
                      <span>{t("student.dashboard.chatOnWhatsApp")}</span>
                    </a>

                    <Link
                      href={`/courses/${req.courseSlug}`}
                      className="inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-xs font-medium text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Discover more courses — preserved from R0 */}
      {discoverCourses.length > 0 && (
        <section className="mt-8 space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight text-on-surface">
                {t("student.dashboard.discoverSectionTitle")}
              </h3>
              <p className="text-xs text-secondary mt-0.5">
                {t("student.dashboard.discoverSectionSubtitle")}
              </p>
            </div>

            <Link
              href="/courses"
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("student.dashboard.viewAll")} →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {discoverCourses.map((c) => (
              <PublicCourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}