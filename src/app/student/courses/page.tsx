import Link from "next/link";

import { requireStudent } from "@/lib/permissions";
import { getStudentDashboard } from "@/services/learning";
import { getPendingEnrollmentsForStudent } from "@/services/enrollments";
import { StudentCourseCard } from "@/components/student/student-course-card";
import { getTranslator } from "@/i18n/server";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { getWhatsAppEnrollmentUrl } from "@/lib/whatsapp";

import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { Tabs } from "@/components/shared/ui/tabs";
import { Badge } from "@/components/shared/ui/badge";
import { EmptyState } from "@/components/shared/feedback";
import {
  ArrowRightIcon,
  BookIcon,
  ClipboardIcon,
  TrophyIcon,
  VideoIcon,
} from "@/components/shared/ui/icons";

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

  let filteredList = allCourses;
  if (activeTab === "in-progress") filteredList = inProgressCourses;
  else if (activeTab === "not-started") filteredList = notStartedCourses;
  else if (activeTab === "completed") filteredList = completedCourses;

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
    { value: "all", label: t("student.courses.tabs.all"), href: "/student/courses", count: allCourses.length },
    { value: "in-progress", label: t("student.courses.tabs.inProgress"), href: "/student/courses?tab=in-progress", count: inProgressCourses.length },
    { value: "not-started", label: t("student.courses.tabs.notStarted"), href: "/student/courses?tab=not-started", count: notStartedCourses.length },
    { value: "completed", label: t("student.courses.tabs.completed"), href: "/student/courses?tab=completed", count: completedCourses.length },
    { value: "pending", label: t("student.courses.tabs.pending"), href: "/student/courses?tab=pending", count: pendingEnrollments.length },
  ];

  return (
    <Container className="py-6 sm:py-8" size="xl">
      <PageHeader
        title={t("student.courses.title")}
        description={t("student.courses.subtitle")}
        actions={
          <Link
            href="/courses"
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary/90"
          >
            <BookIcon size={14} />
            {t("student.courses.emptyCta")}
            <ArrowRightIcon size={14} />
          </Link>
        }
        tabs={<Tabs items={tabs} value={activeTab} className="w-fit" />}
      />

      {(allCourses.length > 0 || pendingEnrollments.length > 0) ? (
        <div className="mt-6">
          <SearchFilterBar searchPlaceholder={t("student.courses.search.placeholder")} />
        </div>
      ) : null}

      {/* Content for Pending Tab */}
      {activeTab === "pending" ? (
        displayedPending.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<ClipboardIcon size={20} />}
              title={isFiltered ? t("common.noResultsFound") : t("student.courses.emptyPendingTitle")}
              description={isFiltered ? t("common.noResultsFoundDesc") : t("student.courses.emptyPendingDesc")}
            />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {displayedPending.map((req) => {
              const whatsAppUrl = getWhatsAppEnrollmentUrl(req.courseTitle, t.locale as "en" | "bn");
              const formattedDate = new Intl.DateTimeFormat(t.locale === "bn" ? "bn-BD" : "en-US", {
                month: "short",
                day: "numeric",
              }).format(new Date(req.enrolledAt));

              return (
                <div
                  key={req.id}
                  className="flex flex-col justify-between gap-4 rounded-3xl border border-outline-variant bg-surface-0 p-5"
                >
                  <div className="flex items-start gap-4">
                    {req.courseThumbnailUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={req.courseThumbnailUrl}
                        alt={req.courseTitle}
                        className="h-16 w-24 shrink-0 rounded-xl border border-outline-variant object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-primary-container/15 text-primary">
                        <BookIcon size={28} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Badge tone="warning" size="xs">
                        {t("student.courses.card.statusPending")}
                      </Badge>
                      <h3 className="mt-1 line-clamp-1 font-display text-base font-semibold text-ink-900">
                        <Link href={`/courses/${req.courseSlug}`} className="hover:text-primary">
                          {req.courseTitle}
                        </Link>
                      </h3>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {req.teacherName ?? "InsideJibon"} · {t("student.dashboard.pendingRequestedAt", { date: formattedDate })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-3">
                    <Link
                      href={`/courses/${req.courseSlug}`}
                      className="text-xs font-semibold text-ink-500 hover:text-primary"
                    >
                      Course Syllabus
                      <ArrowRightIcon size={12} className="ml-1 inline-block" />
                    </Link>
                    <a
                      href={whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-xs font-semibold text-white hover:bg-[#20bd5a]"
                    >
                      <VideoIcon size={12} />
                      <span>{t("student.dashboard.chatOnWhatsApp")}</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : displayedCourses.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<BookIcon size={20} />}
            title={
              isFiltered
                ? t("common.noResultsFound")
                : activeTab === "in-progress"
                  ? t("student.courses.emptyInProgressTitle")
                  : activeTab === "completed"
                    ? t("student.courses.emptyCompletedTitle")
                    : t("student.courses.emptyTitle")
            }
            description={
              isFiltered
                ? t("common.noResultsFoundDesc")
                : activeTab === "in-progress"
                  ? t("student.courses.emptyInProgressDesc")
                  : activeTab === "completed"
                    ? t("student.courses.emptyCompletedDesc")
                    : t("student.courses.emptyDesc")
            }
            action={
              !isFiltered ? (
                <Link
                  href="/courses"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary/90"
                >
                  {t("student.courses.emptyCta")}
                  <ArrowRightIcon size={14} />
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedCourses.map((course) => (
            <StudentCourseCard key={course.courseId} course={course} />
          ))}
        </div>
      )}
    </Container>
  );
}
