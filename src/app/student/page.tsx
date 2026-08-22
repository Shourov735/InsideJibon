import Link from "next/link";

import { requireStudent } from "@/lib/permissions";
import { getStudentDashboard } from "@/services/learning";
import { getUpcomingSessionsForStudent } from "@/services/classes/classes";
import { UpcomingSessionsList } from "@/components/student/classes/upcoming-sessions-list";
import { StudentCourseCard } from "@/components/student/student-course-card";
import { getTranslator } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await requireStudent();
  const t = await getTranslator();
  const [courses, upcomingSessions] = await Promise.all([
    getStudentDashboard(user.id),
    getUpcomingSessionsForStudent(user.id)
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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {t("student.dashboard.greeting", {
            name: user.name?.split(" ")[0] || t("student.dashboard.learnerFallback"),
          })}
        </h1>
        <p className="text-sm text-secondary">
          {t("student.dashboard.subtitle")}
        </p>
      </div>

      {/* 12-Column Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column (8 Cols on Desktop) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
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
          ) : (
            <section className="bento-card-static p-8 text-center border-dashed">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-display text-base font-bold text-on-surface">{t("student.dashboard.getStarted")}</h3>
              <p className="mt-1 text-sm text-secondary max-w-sm mx-auto">
                {t("student.dashboard.noEnrollments")}
              </p>
              <Link
                href="/courses"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-sm hover:bg-primary-container transition-colors"
              >
                {t("student.dashboard.browseCourses")} →
              </Link>
            </section>
          )}

          {/* Enrolled Courses Grid */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold tracking-tight text-on-surface">
                {t("student.dashboard.myCourses")}
              </h3>
              {courses.length > 0 && (
                <Link
                  href="/student/courses"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t("student.dashboard.viewAll")}
                </Link>
              )}
            </div>

            {courses.length === 0 ? null : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <StudentCourseCard key={course.courseId} course={course} />
                ))}
              </div>
            )}
          </section>
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