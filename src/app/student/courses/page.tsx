import Link from "next/link";

import { requireStudent } from "@/lib/permissions";
import { getStudentDashboard } from "@/services/learning";
import { getPendingEnrollmentsForStudent } from "@/services/enrollments";
import { StudentCourseCard } from "@/components/student/student-course-card";
import { getTranslator } from "@/i18n/server";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { getWhatsAppEnrollmentUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

interface StudentCoursesPageProps {
  searchParams: Promise<{ q?: string; tab?: string }>;
}

export default async function StudentCoursesPage({ searchParams }: StudentCoursesPageProps) {
  const user = await requireStudent();
  const t = await getTranslator();
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const activeTab = (params.tab ?? "all") as "all" | "in-progress" | "not-started" | "completed" | "pending";

  const [allCourses, pendingEnrollments] = await Promise.all([
    getStudentDashboard(user.id),
    getPendingEnrollmentsForStudent(user.id),
  ]);

  const inProgressCourses = allCourses.filter((c) => !c.completedAt && c.progress.percent > 0);
  const notStartedCourses = allCourses.filter((c) => !c.completedAt && c.progress.percent === 0);
  const completedCourses = allCourses.filter((c) => Boolean(c.completedAt) || c.progress.percent === 100);

  // Filter based on active tab
  let filteredList = allCourses;
  if (activeTab === "in-progress") {
    filteredList = inProgressCourses;
  } else if (activeTab === "not-started") {
    filteredList = notStartedCourses;
  } else if (activeTab === "completed") {
    filteredList = completedCourses;
  }

  // Filter based on search query
  const displayedCourses = q
    ? filteredList.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.teacherName && c.teacherName.toLowerCase().includes(q))
      )
    : filteredList;

  const displayedPending = q
    ? pendingEnrollments.filter(
        (p) =>
          p.courseTitle.toLowerCase().includes(q) ||
          (p.teacherName && p.teacherName.toLowerCase().includes(q))
      )
    : pendingEnrollments;

  const isFiltered = Boolean(q);

  const tabs = [
    { id: "all", label: t("student.courses.tabs.all"), count: allCourses.length },
    { id: "in-progress", label: t("student.courses.tabs.inProgress"), count: inProgressCourses.length },
    { id: "not-started", label: t("student.courses.tabs.notStarted"), count: notStartedCourses.length },
    { id: "completed", label: t("student.courses.tabs.completed"), count: completedCourses.length },
    { id: "pending", label: t("student.courses.tabs.pending"), count: pendingEnrollments.length },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {t("student.courses.title")}
          </h1>
          <p className="text-sm text-secondary mt-1">
            {t("student.courses.subtitle")}
          </p>
        </div>

        <Link
          href="/courses"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-semibold text-on-primary shadow-xs hover:bg-primary-container hover:text-on-primary-container transition-colors w-full sm:w-auto"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{t("student.courses.emptyCta")}</span>
        </Link>
      </div>

      {/* Tabs bar */}
      <div className="border-b border-outline-variant overflow-x-auto">
        <nav className="-mb-px flex gap-4 min-w-max" aria-label="Course Status Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const href = tab.id === "all" ? "/student/courses" : `/student/courses?tab=${tab.id}`;
            return (
              <Link
                key={tab.id}
                href={href}
                className={`whitespace-nowrap border-b-2 py-3.5 px-2 text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 ${
                  isActive
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-secondary hover:border-outline hover:text-on-surface"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container-high text-secondary"
                  }`}
                >
                  {tab.count}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Search Filter Bar */}
      {(allCourses.length > 0 || pendingEnrollments.length > 0) && (
        <div>
          <SearchFilterBar searchPlaceholder={t("student.courses.search.placeholder")} />
        </div>
      )}

      {/* Content for Pending Tab */}
      {activeTab === "pending" ? (
        displayedPending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container-high text-secondary">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-on-surface">
              {isFiltered ? t("common.noResultsFound") : t("student.courses.emptyPendingTitle")}
            </h2>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              {isFiltered ? t("common.noResultsFoundDesc") : t("student.courses.emptyPendingDesc")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedPending.map((req) => {
              const whatsAppUrl = getWhatsAppEnrollmentUrl(req.courseTitle, t.locale as "en" | "bn");
              const formattedDate = new Intl.DateTimeFormat(t.locale === "bn" ? "bn-BD" : "en-US", {
                month: "short",
                day: "numeric",
              }).format(new Date(req.enrolledAt));

              return (
                <div
                  key={req.id}
                  className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    {req.courseThumbnailUrl ? (
                      <img
                        src={req.courseThumbnailUrl}
                        alt={req.courseTitle}
                        className="h-16 w-24 rounded-xl object-cover border border-outline-variant shrink-0"
                      />
                    ) : (
                      <div className="flex h-16 w-24 items-center justify-center rounded-xl bg-primary-container/15 text-primary shrink-0 border border-outline-variant">
                        <svg className="h-8 w-8 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                          {t("student.courses.card.statusPending")}
                        </span>
                      </div>
                      <h3 className="font-display text-base font-bold text-on-surface line-clamp-1 mt-1">
                        <Link href={`/courses/${req.courseSlug}`} className="hover:text-primary transition-colors">
                          {req.courseTitle}
                        </Link>
                      </h3>
                      <p className="text-xs text-secondary mt-0.5">
                        {req.teacherName ?? "InsideJibon"} · {t("student.dashboard.pendingRequestedAt", { date: formattedDate })}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-outline-variant pt-3 flex items-center justify-between gap-3">
                    <Link
                      href={`/courses/${req.courseSlug}`}
                      className="text-xs font-semibold text-secondary hover:text-primary hover:underline"
                    >
                      Course Syllabus →
                    </Link>

                    <a
                      href={whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white px-3.5 py-1.5 text-xs font-bold shadow-2xs transition-colors"
                    >
                      <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.976.58 1.992.921 3.149.921l.002-.001c3.182 0 5.768-2.587 5.769-5.766.001-3.182-2.585-5.769-5.771-5.769zm3.364 8.163c-.14.394-.809.761-1.121.808-.288.043-.665.076-1.921-.444-1.608-.665-2.651-2.296-2.73-2.402-.079-.106-.649-.864-.649-1.648 0-.784.408-1.171.554-1.332.146-.161.32-.201.427-.201.107 0 .213.001.306.006.098.005.23-.037.36.275.14.336.478 1.166.52 1.252.043.086.071.188.014.302-.057.114-.086.185-.171.285-.086.1-.18.223-.257.3-.086.086-.176.18-.076.352.1.171.444.733.953 1.186.656.585 1.209.766 1.381.852.172.086.272.072.373-.044.101-.116.434-.505.549-.678.115-.173.23-.144.388-.086.158.058 1.002.472 1.174.558.172.086.287.129.33.201.043.072.043.418-.097.812zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.957-1.399C8.423 21.493 10.153 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
                      </svg>
                      <span>{t("student.dashboard.chatOnWhatsApp")}</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : displayedCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-high text-primary">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-on-surface">
              {isFiltered
                ? t("common.noResultsFound")
                : activeTab === "in-progress"
                  ? t("student.courses.emptyInProgressTitle")
                  : activeTab === "completed"
                    ? t("student.courses.emptyCompletedTitle")
                    : t("student.courses.emptyTitle")}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-secondary max-w-md mx-auto">
              {isFiltered
                ? t("common.noResultsFoundDesc")
                : activeTab === "in-progress"
                  ? t("student.courses.emptyInProgressDesc")
                  : activeTab === "completed"
                    ? t("student.courses.emptyCompletedDesc")
                    : t("student.courses.emptyDesc")}
            </p>
          </div>

          {!isFiltered && (
            <div>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
              >
                {t("student.courses.emptyCta")} →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayedCourses.map((course) => (
            <StudentCourseCard key={course.courseId} course={course} />
          ))}
        </div>
      )}
    </main>
  );
}