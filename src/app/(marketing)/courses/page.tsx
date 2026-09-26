import type { Metadata } from "next";

import { getPublishedCourses } from "@/services/courses";
import { PublicCourseCard } from "@/components/public/course-card";
import { getTranslator } from "@/i18n/server";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { COURSE_CATEGORIES } from "@/schemas/course";
import type { CourseCategory } from "@/db/schema";
import { resolveCurrentUser } from "@/lib/auth";
import { getStudentEnrollments } from "@/services/enrollments";
import { listPublishedBundleCourseIds } from "@/services/payments";

import { buildAlternates, buildBreadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { Container } from "@/components/shared/ui/container";
import { Badge } from "@/components/shared/ui/badge";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { BookIcon } from "@/components/shared/ui/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  const isBn = t.locale === "bn";
  const title = t("seo.courses.title");
  const description = t("seo.courses.description");

  return {
    title: isBn ? "কোর্সসমূহ" : "Courses",
    description,
    alternates: buildAlternates("/courses"),
    openGraph: {
      title,
      description,
      url: "https://insidejibon.com/courses",
      siteName: "InsideJibon",
      locale: isBn ? "bn_BD" : "en_US",
      alternateLocale: [isBn ? "en_US" : "bn_BD"],
      type: "website",
      images: [
        {
          url: "/images/og-image.jpg",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/og-image.jpg"],
    },
  };
}

interface PublicCoursesPageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function PublicCoursesPage({ searchParams }: PublicCoursesPageProps) {
  const t = await getTranslator();
  const params = await searchParams;
  const q = params.q ?? "";
  const category = params.category as CourseCategory | undefined;

  const { user } = await resolveCurrentUser();
  const [coursesList, studentEnrollments, bundleCourseIds] = await Promise.all([
    getPublishedCourses({
      q: q || undefined,
      category: category || undefined,
    }),
    user?.role === "student" ? getStudentEnrollments(user.id) : Promise.resolve([]),
    listPublishedBundleCourseIds(),
  ]);

  const enrollmentStatusMap = new Map(
    studentEnrollments.map((e) => [e.courseId, e.status])
  );
  const bundleCourseIdSet = new Set(bundleCourseIds);

  const categoryOptions = COURSE_CATEGORIES.map((cat) => ({
    value: cat,
    label: t(`course.category.${cat}` as Parameters<typeof t>[0]),
  }));

  const isFiltered = Boolean(q || category);

  return (
    <div>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: t("marketing.home"), url: "/" },
          { name: t("marketing.header.courses"), url: "/courses" },
        ])}
      />

      {/* Hero */}
      <section className="border-b border-outline-variant bg-surface-0">
        <Container className="py-10 sm:py-16" size="xl">
          <div className="max-w-2xl space-y-3">
            <Badge tone="primary" size="sm">
              {t("marketing.coursesBadge")}
            </Badge>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900 sm:text-4xl">
              {t("marketing.coursesTitleA")}{" "}
              <span className="text-primary">{t("marketing.coursesTitleB")}</span>
            </h1>
            <p className="text-base leading-relaxed text-ink-500">
              {t("marketing.coursesDescription")}
              {coursesList.length > 0
                ? ` ${t.tn("marketing.showingCourses", coursesList.length)}`
                : ""}
            </p>
          </div>
        </Container>
      </section>

      {/* Filter / grid */}
      <section className="bg-surface-1">
        <Container className="py-8 sm:py-12" size="xl">
          <div className="mb-6 sm:mb-8">
            <SearchFilterBar
              searchPlaceholder={t("marketing.courses.search.placeholder")}
              filters={[
                {
                  param: "category",
                  label: t("common.allCategories"),
                  allLabel: t("common.allCategories"),
                  options: categoryOptions,
                },
              ]}
            />
          </div>

          {coursesList.length === 0 ? (
            <EmptyState
              icon={<BookIcon size={20} />}
              title={
                isFiltered
                  ? t("common.noResultsFound")
                  : t("marketing.coursesEmptyTitle")
              }
              description={
                isFiltered
                  ? t("common.noResultsFoundDesc")
                  : t("marketing.coursesEmptyDesc")
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {coursesList.map((course) => (
                <PublicCourseCard
                  key={course.id}
                  course={course}
                  enrollmentStatus={enrollmentStatusMap.get(course.id)}
                  inBundle={bundleCourseIdSet.has(course.id)}
                />
              ))}
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}
