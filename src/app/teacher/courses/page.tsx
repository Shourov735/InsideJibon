import Link from "next/link";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourses, getTeacherCourseStatusCounts } from "@/services/courses";
import { CourseCard } from "@/components/teacher/course-card";
import { getTranslator } from "@/i18n/server";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { COURSE_CATEGORIES } from "@/schemas/course";
import type { CourseStatus, CourseCategory } from "@/db/schema";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { Stat } from "@/components/shared/ui/stat";
import { Button } from "@/components/shared/ui/button";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { BookIcon, PlusIcon } from "@/components/shared/ui/icons";
import { formatNumber } from "@/lib/utils";

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

  const [coursesList, statusCounts] = await Promise.all([
    getTeacherCourses(teacher.id, {
      q: q || undefined,
      status: status || undefined,
      category: category || undefined,
    }),
    getTeacherCourseStatusCounts(teacher.id),
  ]);

  const publishedCount = statusCounts.published;
  const draftCount = statusCounts.draft;
  const archivedCount = statusCounts.archived;
  const allCoursesTotal = publishedCount + draftCount + archivedCount;

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
    <Container className="py-6 sm:py-8" size="xl">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <BookIcon size={14} />
            {t("teacher.courses.badge")}
          </span>
        }
        title={t("teacher.courses.badge")}
        description={t("teacher.courses.subtitle")}
        actions={
          <Link href="/teacher/courses/new">
            <Button variant="primary" size="md" leadingIcon={<PlusIcon size={14} />}>
              {t("teacher.courses.create")}
            </Button>
          </Link>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat
          label={t("teacher.dashboard.stats.totalCourses")}
          value={formatNumber(allCoursesTotal, { locale: t.locale })}
          tone="primary"
        />
        <Stat
          label={t("teacher.courses.stat.published")}
          value={formatNumber(publishedCount, { locale: t.locale })}
          tone="success"
        />
        <Stat
          label={t("teacher.courses.stat.drafts")}
          value={formatNumber(draftCount, { locale: t.locale })}
          tone="neutral"
        />
        <Stat
          label={t("teacher.courses.stat.archived")}
          value={formatNumber(archivedCount, { locale: t.locale })}
          tone="warning"
        />
      </div>

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

      <div className="mt-6">
        {coursesList.length === 0 ? (
          <EmptyState
            icon={<BookIcon size={20} />}
            title={isFiltered ? t("common.noResultsFound") : t("teacher.courses.emptyTitle")}
            description={
              isFiltered ? t("common.noResultsFoundDesc") : t("teacher.courses.emptyDesc")
            }
            action={
              !isFiltered ? (
                <Link href="/teacher/courses/new">
                  <Button variant="primary" size="md" leadingIcon={<PlusIcon size={14} />}>
                    {t("teacher.courses.emptyCta")}
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coursesList.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
