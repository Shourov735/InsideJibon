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
import { getTranslator } from "@/i18n/server";
import { getWhatsAppEnrollmentUrl } from "@/lib/whatsapp";

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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {t("student.dashboard.greeting", {
              name: user.name?.split(" ")[0] || t("student.dashboard.learnerFallback"),
            })}
          </h1>
          <p className="text-sm text-secondary mt-1">
            {t("student.dashboard.subtitle")}
          </p>
        </div>

        <Link
          href="/courses"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs sm:text-sm font-semibold text-primary shadow-2xs hover:bg-surface-container hover:border-primary/40 transition-colors w-full sm:w-auto"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>{t("student.dashboard.browseAllCourses")}</span>
        </Link>
      </div>

      {/* 12-Column Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column (8 Cols on Desktop) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Continue Learning Bento Hero Card */}
          {continueCourse ? (
            <section className="bento-card overflow-hidden flex flex-col sm:flex-row">
              <div className="sm:w-2/5 h-48 sm:h-auto relative bg-surface-container-high overflow-hidden shrink-0">
                {continueCourse.thumbnailUrl ? (
                  <img
                    src={continueCourse.thumbnailUrl}
                    alt={continueCourse.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/10">
                    <svg className="h-12 w-12 text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <span className="rounded-full bg-primary-container px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-primary-container">
                    In Progress
                  </span>
                </div>
              </div>

              <div className="sm:w-3/5 p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    {t("student.dashboard.continueCourse")}
                  </span>
                  <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-on-surface line-clamp-1">
                    {continueCourse.title}
                  </h2>
                  <p className="mt-1 text-xs text-secondary truncate">
                    {continueCourse.lastLesson
                      ? t("student.dashboard.resumeLesson", { title: continueCourse.lastLesson.title })
                      : t("student.dashboard.startFromBeginning")}
                  </p>
                </div>

                <div className="mt-5">
                  <div className="flex justify-between items-center text-xs font-semibold text-secondary mb-1.5">
                    <span>{continueCourse.progress.percent}% Complete</span>
                    <span>Lesson {continueCourse.progress.completed} of {continueCourse.progress.total}</span>
                  </div>
                  <div className="w-full bg-surface-container-highest rounded-full h-2 mb-4 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${continueCourse.progress.percent}%` }}
                    />
                  </div>

                  {continueHref && (
                    <Link
                      href={continueHref}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-colors w-full sm:w-auto"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t("student.dashboard.continue")}
                    </Link>
                  )}
                </div>
              </div>
            </section>
          ) : courses.length === 0 && pendingEnrollments.length === 0 ? (
            <section className="bento-card overflow-hidden">
              <div className="relative aspect-[21/9] w-full overflow-hidden bg-surface-container-high">
                <img
                  src="/images/learning-banner.jpg"
                  alt="Start Learning"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-end p-6 sm:p-8">
                  <div className="text-white">
                    <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Start Your Journey</span>
                    <h3 className="font-display text-xl sm:text-2xl font-bold mt-0.5">{t("student.dashboard.getStarted")}</h3>
                    <p className="text-xs sm:text-sm text-gray-200 mt-1 max-w-md">
                      {t("student.dashboard.noEnrollments")}
                    </p>
                    <Link
                      href="/courses"
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-bold text-primary shadow-sm hover:bg-gray-100 transition-colors"
                    >
                      {t("student.dashboard.browseCourses")} →
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* Pending Enrollment Requests Section */}
          {pendingEnrollments.length > 0 && (
            <section className="space-y-4 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                    {t("student.dashboard.pendingSectionTitle")} ({pendingEnrollments.length})
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
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
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.976.58 1.992.921 3.149.921l.002-.001c3.182 0 5.768-2.587 5.769-5.766.001-3.182-2.585-5.769-5.771-5.769zm3.364 8.163c-.14.394-.809.761-1.121.808-.288.043-.665.076-1.921-.444-1.608-.665-2.651-2.296-2.73-2.402-.079-.106-.649-.864-.649-1.648 0-.784.408-1.171.554-1.332.146-.161.32-.201.427-.201.107 0 .213.001.306.006.098.005.23-.037.36.275.14.336.478 1.166.52 1.252.043.086.071.188.014.302-.057.114-.086.185-.171.285-.086.1-.18.223-.257.3-.086.086-.176.18-.076.352.1.171.444.733.953 1.186.656.585 1.209.766 1.381.852.172.086.272.072.373-.044.101-.116.434-.505.549-.678.115-.173.23-.144.388-.086.158.058 1.002.472 1.174.558.172.086.287.129.33.201.043.072.043.418-.097.812zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.957-1.399C8.423 21.493 10.153 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
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

          {/* Enrolled Courses Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold tracking-tight text-on-surface">
                {t("student.dashboard.myCourses")}
              </h3>
              {courses.length > 0 && (
                <Link
                  href="/student/courses"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t("student.dashboard.viewAll")} ({courses.length}) →
                </Link>
              )}
            </div>

            {courses.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center space-y-3">
                <p className="text-sm text-secondary">
                  {pendingEnrollments.length > 0
                    ? "Your enrollment requests are currently pending approval. Once approved, your courses will appear here."
                    : t("student.dashboard.noEnrollments")}
                </p>
                <div>
                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-container transition-colors"
                  >
                    {t("student.dashboard.browseCourses")} →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <StudentCourseCard key={course.courseId} course={course} />
                ))}
              </div>
            )}
          </section>

          {/* Discover More Courses Section */}
          {discoverCourses.length > 0 && (
            <section className="space-y-4 pt-2">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {discoverCourses.map((c) => (
                  <PublicCourseCard key={c.id} course={c} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Column (4 Cols on Desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Quick Metrics Bento Card */}
          <div className="bento-card-static p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">
              Academic Overview
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                <p className="font-display text-2xl font-bold text-primary">{courses.length}</p>
                <span className="text-[11px] font-semibold text-secondary block mt-0.5">
                  {t("student.dashboard.stats.enrolled")}
                </span>
              </div>
              <div className="text-center p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                <p className="font-display text-2xl font-bold text-emerald-600">{completedCount}</p>
                <span className="text-[11px] font-semibold text-secondary block mt-0.5">
                  {t("student.dashboard.stats.completed")}
                </span>
              </div>
              <div className="text-center p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                <p className="font-display text-2xl font-bold text-amber-600">{averageProgress}%</p>
                <span className="text-[11px] font-semibold text-secondary block mt-0.5">
                  Avg.
                </span>
              </div>
            </div>
          </div>

          {/* Recent Notifications Widget */}
          <div className="bento-card-static p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-on-surface">
                {t("student.dashboard.recentNotifications")}
              </h3>
              <Link href="/student/notifications" className="text-[11px] font-semibold text-primary hover:underline">
                {t("student.dashboard.viewAll")} →
              </Link>
            </div>

            {recentNotifications.length === 0 ? (
              <p className="text-xs text-secondary py-2 text-center">
                {t("student.dashboard.noRecentNotifications")}
              </p>
            ) : (
              <div className="space-y-2">
                {recentNotifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link || "/student/notifications"}
                    className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-surface-container transition-colors"
                  >
                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.isRead ? "bg-outline" : "bg-primary"}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${n.isRead ? "text-secondary" : "text-on-surface"}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-secondary line-clamp-1 mt-0.5">
                        {n.body}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Live Sessions Card */}
          <div className="bento-card-static p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-bold text-on-surface">
                {t("student.classes.upcomingClasses")}
              </h3>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <UpcomingSessionsList sessions={upcomingSessions} />
          </div>

          {/* Tanvir Hasan Jibon Support Box */}
          <div className="bento-card-static p-5 bg-gradient-to-br from-surface-container-low to-surface-container border border-outline-variant">
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/jibon.jpg"
                alt="Tanvir Hasan Jibon"
                className="h-10 w-10 rounded-full object-cover border border-outline-variant shrink-0"
              />
              <div>
                <p className="font-display text-xs font-bold text-on-surface">তানভীর হাসান জীবন</p>
                <p className="text-[11px] text-secondary">Science & Math Educator</p>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              নিয়মিত ক্লাস করুন, নোট তৈরি করুন এবং প্রতিটি অধ্যায়ের পরীক্ষা দিন। যেকোনো প্রশ্নে আলোচনা ট্যাবে মন্তব্য করুন।
            </p>
            <div className="mt-3 flex gap-2">
              <a
                href="https://youtube.com/@tanvirhasanjibon5827"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline"
              >
                YouTube Channel →
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}