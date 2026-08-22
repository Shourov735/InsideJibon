import Link from "next/link";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourses } from "@/services/courses";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { CourseCard } from "@/components/teacher/course-card";
import { getTranslator } from "@/i18n/server";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { COURSE_CATEGORIES } from "@/schemas/course";
import type { CourseStatus, CourseCategory } from "@/db/schema";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Courses | InsideJibon Educator",
  description: "Manage your courses, curriculum, modules, and lessons.",
};

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; category?: string }>;
}

export default async function TeacherCoursesPage({ searchParams }: PageProps) {
  const teacher = await requireTeacher();
  const t = await getTranslator();
  const params = await searchParams;

  const q = params.q ?? "";
  const status = params.status as CourseStatus | undefined;
  const category = params.category as CourseCategory | undefined;

  const coursesList = await getTeacherCourses(teacher.id, {
    q: q || undefined,
    status: status || undefined,
    category: category || undefined,
  });

  // Always fetch all for stats (no filter)
  const allCourses = await getTeacherCourses(teacher.id);
  const publishedCount = allCourses.filter((c) => c.status === "published").length;
  const draftCount = allCourses.filter((c) => c.status === "draft").length;
  const archivedCount = allCourses.filter((c) => c.status === "archived").length;

  const statusOptions = [
    { value: "draft", label: t("common.status.draft") },
    { value: "published", label: t("common.status.published") },
    { value: "archived", label: t("common.status.archived") },
  ];

  const categoryOptions = COURSE_CATEGORIES.map((cat) => ({
    value: cat,
    label: t(`course.category.${cat}` as Parameters<typeof t>[0]),
  }));

  const isFiltered = !!(q || status || category);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="courses" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">
              {t("teacher.courses.badge")}
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              {t("teacher.courses.subtitle")}
            </p>
          </div>

          <Link
            href="/teacher/courses/new"
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
            <span>{t("teacher.courses.create")}</span>
          </Link>
        </div>

        {/* Metric Badges / Summary */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.dashboard.stats.totalCourses")}
            </span>
            <p className="mt-1 text-2xl font-bold text-primary">
              {allCourses.length}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.courses.stat.published")}
            </span>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {publishedCount}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.courses.stat.drafts")}
            </span>
            <p className="mt-1 text-2xl font-bold text-secondary">
              {draftCount}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.courses.stat.archived")}
            </span>
            <p className="mt-1 text-2xl font-bold text-amber-700">
              {archivedCount}
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mt-6">
          <SearchFilterBar
            searchPlaceholder={t("teacher.courses.search.placeholder")}
            filters={[
              {
                param: "status",
                label: t("common.allStatuses"),
                allLabel: t("common.allStatuses"),
                options: statusOptions,
              },
              {
                param: "category",
                label: t("common.allCategories"),
                allLabel: t("common.allCategories"),
                options: categoryOptions,
              },
            ]}
          />
        </div>

        {/* Courses Grid / Empty State */}
        <div className="mt-8">
          {coursesList.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-high text-primary">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-bold text-on-surface">
                {isFiltered ? t("common.noResultsFound") : t("teacher.courses.emptyTitle")}
              </h3>
              <p className="mt-1 text-sm text-secondary">
                {isFiltered ? t("common.noResultsFoundDesc") : t("teacher.courses.emptyDesc")}
              </p>
              {!isFiltered && (
                <div className="mt-6">
                  <Link
                    href="/teacher/courses/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
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
                    <span>{t("teacher.courses.emptyCta")}</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {coursesList.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
