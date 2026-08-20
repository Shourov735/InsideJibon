import type { Metadata } from "next";

import { getPublishedCourses } from "@/services/courses";
import { PublicCourseCard } from "@/components/public/course-card";
import { getTranslator } from "@/i18n/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Browse published courses on InsideJibon — structured learning paths created by experienced teachers.",
  openGraph: {
    title: "Courses | InsideJibon",
    description:
      "Browse published courses on InsideJibon — structured learning paths created by experienced teachers.",
  },
};

export default async function PublicCoursesPage() {
  const t = await getTranslator();
  const coursesList = await getPublishedCourses();

  return (
    <div>
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
              t.tn("marketing.showingCourses", coursesList.length)}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
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
              {t("marketing.coursesEmptyTitle")}
            </h2>
            <p className="mt-1 text-sm text-secondary">
              {t("marketing.coursesEmptyDesc")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coursesList.map((course) => (
              <PublicCourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}