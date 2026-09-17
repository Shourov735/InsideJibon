import type { Metadata } from "next";

import { getPublishedCourses } from "@/services/courses";
import { PublicCourseCard } from "@/components/public/course-card";
import { getTranslator } from "@/i18n/server";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { COURSE_CATEGORIES } from "@/schemas/course";
import type { CourseCategory } from "@/db/schema";
import { resolveCurrentUser } from "@/lib/auth";
import { getStudentEnrollments } from "@/services/enrollments";

import { buildAlternates, buildBreadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";

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
  const [coursesList, studentEnrollments] = await Promise.all([
    getPublishedCourses({
      q: q || undefined,
      category: category || undefined,
    }),
    user?.role === "student" ? getStudentEnrollments(user.id) : Promise.resolve([]),
  ]);

  const enrollmentStatusMap = new Map(
    studentEnrollments.map((e) => [e.courseId, e.status])
  );

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
      <section className="bg-surface-container-lowest border-b border-outline-variant">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="mb-4 inline-block rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-xs font-medium uppercase tracking-wider text-on-surface-variant">
            {t("marketing.coursesBadge")}
          </p>
          <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-on-surface sm:text-4xl">
            {t("marketing.coursesTitleA")}{" "}
            <span className="text-primary">{t("marketing.coursesTitleB")}</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-on-surface-variant">
            {t("marketing.coursesDescription")}
            {coursesList.length > 0 &&
              ` ${t.tn("marketing.showingCourses", coursesList.length)}`}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
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
          <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
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
            <h2 className="mt-4 text-lg font-bold text-on-surface">
              {isFiltered ? t("common.noResultsFound") : t("marketing.coursesEmptyTitle")}
            </h2>
            <p className="mt-1 text-sm text-secondary">
              {isFiltered ? t("common.noResultsFoundDesc") : t("marketing.coursesEmptyDesc")}
            </p>
          </div>
        ) : (
          <div>
            <h2 className="sr-only">{t("marketing.coursesBadge")}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coursesList.map((course) => (
              <PublicCourseCard
                key={course.id}
                course={course}
                enrollmentStatus={enrollmentStatusMap.get(course.id)}
              />
            ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}