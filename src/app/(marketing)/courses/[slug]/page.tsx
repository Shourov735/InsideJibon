import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { resolveCurrentUser } from "@/lib/auth";
import { getStudentEnrollment } from "@/services/enrollments";
import { getPublishedCourseBySlugWithTeacher } from "@/services/courses";
import { EnrollButton } from "@/components/student/enroll-button";
import { getCheapestPublishedBundleForCourse } from "@/services/payments";
import { getTranslator } from "@/i18n/server";
import {
  buildAlternates,
  buildBreadcrumbJsonLd,
  buildCourseJsonLd,
} from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { getDb } from "@/db";
import { lessons, courseModules } from "@/db/schema";
import { and, desc, eq, isNotNull, or } from "drizzle-orm";
import { extractYouTubeVideoId } from "@/lib/video/youtube";
import { CoursePreviewVideo } from "@/components/public/course-preview-video";

import { Container } from "@/components/shared/ui/container";
import { Badge } from "@/components/shared/ui/badge";
import { Stat } from "@/components/shared/ui/stat";
import {
  BookIcon,
  CalendarIcon,
  ChevronRightIcon,
  PlayIcon,
  TrophyIcon,
} from "@/components/shared/ui/icons";

export const revalidate = 120;

interface PublicCourseDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PublicCourseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getPublishedCourseBySlugWithTeacher(slug);

  if (!course) {
    return {
      title: "Course Not Found",
      robots: { index: false, follow: false },
    };
  }

  const t = await getTranslator();
  const isBn = t.locale === "bn";
  const courseUrl = `https://insidejibon.com/courses/${course.slug}`;
  const courseTitle = `${course.title} | InsideJibon`;
  const courseDescription =
    course.description ||
    (isBn
      ? `${course.title} — ইনসাইড জীবনে পরিকল্পিত একাডেমিক ভিডিও পাঠ, অ্যাসাইনমেন্ট ও পরীক্ষা প্রস্তুতি।`
      : `Master ${course.title} with structured video lessons, assignments, and exam practice on InsideJibon.`);

  const imageUrl = course.thumbnailUrl
    ? course.thumbnailUrl.startsWith("http")
      ? course.thumbnailUrl
      : `https://insidejibon.com${course.thumbnailUrl}`
    : "https://insidejibon.com/images/og-image.jpg";

  return {
    title: course.title,
    description: courseDescription,
    alternates: buildAlternates(`/courses/${course.slug}`),
    openGraph: {
      title: courseTitle,
      description: courseDescription,
      url: courseUrl,
      siteName: "InsideJibon",
      locale: isBn ? "bn_BD" : "en_US",
      alternateLocale: [isBn ? "en_US" : "bn_BD"],
      type: "article",
      publishedTime: course.publishedAt ? new Date(course.publishedAt).toISOString() : undefined,
      authors: [course.teacher.name || "Tanvir Hasan Jibon"],
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: course.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: courseTitle,
      description: courseDescription,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },
  };
}

export default async function PublicCourseDetailPage({
  params,
}: PublicCourseDetailPageProps) {
  const { slug } = await params;
  const course = await getPublishedCourseBySlugWithTeacher(slug);

  if (!course) {
    notFound();
  }

  const t = await getTranslator();
  const { user } = await resolveCurrentUser();
  const canEnroll = user?.role === "student";
  const enrollmentStatus = canEnroll
    ? ((await getStudentEnrollment(user.id, course.id))?.status ?? "none")
    : "none";

  const isPaidCourse = course.requiresPayment && course.priceBdt;
  const cheapestBundle = isPaidCourse
    ? await getCheapestPublishedBundleForCourse(course.id)
    : null;
  const formattedCoursePrice = isPaidCourse
    ? new Intl.NumberFormat(t.locale === "bn" ? "bn-BD" : "en-US").format(
        Number(course.priceBdt)
      )
    : null;
  const formattedBundlePrice = cheapestBundle
    ? new Intl.NumberFormat(t.locale === "bn" ? "bn-BD" : "en-US").format(
        Number(cheapestBundle.priceBdt)
      )
    : null;

  const totalLessons = course.modules.reduce(
    (acc, mod) => acc + mod.lessons.length,
    0
  );
  const freeLessons = course.modules.reduce(
    (acc, mod) => acc + mod.lessons.filter((lesson) => lesson.isFree).length,
    0
  );

  const formattedPublished = course.publishedAt
    ? new Intl.DateTimeFormat(t.locale === "bn" ? "bn-BD" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(course.publishedAt))
    : null;

  let previewVideoId: string | null = null;
  try {
    const db = getDb();
    const [previewLesson] = await db
      .select({
        youtubeVideoId: lessons.youtubeVideoId,
        videoUrl: lessons.videoUrl,
      })
      .from(lessons)
      .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
      .where(
        and(
          eq(courseModules.courseId, course.id),
          or(isNotNull(lessons.youtubeVideoId), isNotNull(lessons.videoUrl))
        )
      )
      .orderBy(desc(lessons.isFree), lessons.position)
      .limit(1);

    if (previewLesson?.youtubeVideoId) {
      previewVideoId = previewLesson.youtubeVideoId;
    } else if (previewLesson?.videoUrl) {
      previewVideoId = extractYouTubeVideoId(previewLesson.videoUrl);
    }
  } catch {
    // Non-blocking fallback
  }

  if (!previewVideoId && course.thumbnailUrl) {
    previewVideoId = extractYouTubeVideoId(course.thumbnailUrl);
  }

  const primaryCta = (
    <EnrollButton
      courseId={course.id}
      courseSlug={course.slug}
      courseTitle={course.title}
      canEnroll={canEnroll}
      enrollmentStatus={enrollmentStatus}
      priceBdt={course.priceBdt}
    />
  );

  return (
    <div>
      <JsonLd data={buildCourseJsonLd(course, t.locale as "en" | "bn")} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: t("marketing.home"), url: "/" },
          { name: t("marketing.header.courses"), url: "/courses" },
          { name: course.title, url: `/courses/${course.slug}` },
        ])}
      />

      {/* Hero / preview */}
      <section className="border-b border-outline-variant bg-surface-0">
        <Container className="py-8 sm:py-12" size="xl">
          {/* Breadcrumb */}
          <nav className="mb-5 flex items-center gap-1.5 text-xs font-medium text-ink-500">
            <Link href="/" className="hover:text-ink-900">
              {t("marketing.home")}
            </Link>
            <ChevronRightIcon size={12} />
            <Link href="/courses" className="hover:text-ink-900">
              {t("marketing.header.courses")}
            </Link>
            <ChevronRightIcon size={12} />
            <span className="truncate text-ink-900">{course.title}</span>
          </nav>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Main column */}
            <div className="space-y-5 lg:col-span-8">
              {/* Preview video */}
              {previewVideoId || course.thumbnailUrl ? (
                <div className="overflow-hidden rounded-3xl border border-outline-variant bg-surface-1">
                  <div className="relative aspect-video w-full">
                    <CoursePreviewVideo
                      youtubeVideoId={previewVideoId}
                      thumbnailUrl={course.thumbnailUrl}
                      title={course.title}
                      badgeLabel={t("learning.player.previewNotice")}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              ) : null}

              {/* Title + meta */}
              <div className="space-y-3">
                <Badge tone="primary" size="sm">
                  {course.category ? t(`course.category.${course.category}` as Parameters<typeof t>[0]) : "Course"}
                </Badge>
                <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-ink-900 sm:text-3xl lg:text-4xl">
                  {course.title}
                </h1>
                {course.description ? (
                  <p className="max-w-3xl text-sm leading-relaxed text-ink-500 sm:text-base">
                    {course.description}
                  </p>
                ) : (
                  <p className="max-w-3xl text-sm leading-relaxed text-ink-500 sm:text-base">
                    {t("marketing.courseDetail.fallbackDescription")}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={course.teacher.imageUrl || "/jibon.jpg"}
                      alt={course.teacher.name || "Tanvir Hasan Jibon"}
                      className="h-9 w-9 rounded-full border border-outline-variant object-cover"
                      loading="lazy"
                      decoding="async"
                      width={36}
                      height={36}
                    />
                    <div className="leading-tight">
                      <p className="text-sm font-semibold text-ink-900">
                        {course.teacher.name || "Tanvir Hasan Jibon"}
                      </p>
                      <p className="text-xs text-ink-500">Lead Educator</p>
                    </div>
                  </div>
                  {formattedPublished ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
                      <CalendarIcon size={14} />
                      {t("common.publishedShort", { date: formattedPublished })}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat
                  label={t("marketing.courseDetail.modules")}
                  value={course.moduleCount}
                  icon={<BookIcon size={18} />}
                />
                <Stat
                  label={t("marketing.courseDetail.lessons")}
                  value={totalLessons}
                  icon={<PlayIcon size={18} />}
                />
                <Stat
                  label={t("marketing.courseDetail.freePreviews")}
                  value={freeLessons}
                  icon={<TrophyIcon size={18} />}
                  tone="success"
                  className="col-span-2 sm:col-span-1"
                />
              </div>
            </div>

            {/* Sidebar — sticky CTA */}
            <aside className="lg:col-span-4">
              <div className="sticky top-20 space-y-3 rounded-3xl border border-outline-variant bg-surface-0 p-5 shadow-[0_4px_14px_-6px_rgba(0,0,0,0.08)]">
                {isPaidCourse ? (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      {cheapestBundle ? "Bundle price" : "Course price"}
                    </div>
                    <div className="font-display text-3xl font-bold text-ink-900">
                      ৳{cheapestBundle ? formattedBundlePrice : formattedCoursePrice}
                    </div>
                    {cheapestBundle ? (
                      <Badge tone="warning" size="xs">
                        {t("payment.detail.bundleAvailable")}
                      </Badge>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      Enrollment
                    </div>
                    <div className="font-display text-xl font-bold text-ink-900">
                      Free
                    </div>
                  </div>
                )}

                {primaryCta}



                <div className="space-y-2 border-t border-outline-variant pt-3 text-xs text-ink-500">
                  <div className="flex items-center gap-2">
                    <PlayIcon size={14} />
                    {totalLessons} {t("marketing.courseDetail.lessons")}
                  </div>
                  <div className="flex items-center gap-2">
                    <BookIcon size={14} />
                    {course.moduleCount} {t("marketing.courseDetail.modules")}
                  </div>
                  {cheapestBundle && canEnroll ? (
                    <div className="flex items-center gap-2">
                      <TrophyIcon size={14} />
                      Save with a bundle
                    </div>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* Curriculum */}
      <section className="bg-surface-1">
        <Container className="py-10 sm:py-14" size="xl">
          <div className="mb-6 max-w-2xl sm:mb-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              {t("marketing.courseDetail.curriculum")}
            </h2>
            <p className="mt-1 text-sm text-ink-500 sm:text-base">
              {t("marketing.courseDetail.curriculumSubtitle")}
            </p>
          </div>

          {course.modules.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-outline-variant bg-surface-0 p-10 text-center">
              <p className="text-sm text-ink-500">
                {t("marketing.courseDetail.curriculumPreparing")}
              </p>
            </div>
          ) : (
            <ol className="space-y-3">
              {course.modules.map((mod) => (
                <li
                  key={mod.id}
                  className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-0"
                >
                  <div className="flex flex-col gap-2 border-b border-outline-variant p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary-container px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-primary-container">
                          Module {mod.position}
                        </span>
                        <h3 className="truncate text-sm font-semibold text-ink-900 sm:text-base">
                          {mod.title}
                        </h3>
                      </div>
                      {mod.description ? (
                        <p className="mt-1 text-xs text-ink-500">{mod.description}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs font-medium text-ink-500">
                      {t.tn("common.lessonCountLower", mod.lessons.length)}
                    </span>
                  </div>
                  <ul className="divide-y divide-outline-variant">
                    {mod.lessons.length === 0 ? (
                      <li className="px-4 py-3 text-xs italic text-ink-500 sm:px-5">
                        {t("marketing.courseDetail.lessonsPreparing")}
                      </li>
                    ) : (
                      mod.lessons.map((lesson) => (
                        <li
                          key={lesson.id}
                          className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs sm:px-5"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="font-mono text-[11px] text-ink-500">
                              {mod.position}.{lesson.position}
                            </span>
                            <PlayIcon size={12} className="text-ink-500" />
                            <span className="truncate font-medium text-ink-900">
                              {lesson.title}
                            </span>
                            {lesson.isFree ? (
                              <Badge tone="success" size="xs">
                                Free
                              </Badge>
                            ) : null}
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </Container>
      </section>
    </div>
  );
}
