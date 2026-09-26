import Link from "next/link";
import { notFound } from "next/navigation";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseWithCurriculum } from "@/services/courses";
import { getTeacherCourseMaterials } from "@/services/materials";
import { getTeacherExams } from "@/services/exams";
import { getTeacherAssignments } from "@/services/assignments";
import { getTeacherSessionsForCourse } from "@/services/classes";
import { getTeacherAnnouncementsForCourse } from "@/services/announcements";
import { getPendingRequestsForCourses } from "@/services/enrollments";
import { PendingRequestsList } from "@/components/shared/pending-requests-list";
import { CoursePublishControl } from "@/components/teacher/course-publish-control";
import { getTranslator } from "@/i18n/server";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { SectionHeader } from "@/components/shared/ui/section-header";
import { Stat } from "@/components/shared/ui/stat";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import {
  BookIcon,
  ChevronRightIcon,
  ClipboardIcon,
  ChartIcon,
  SettingsIcon,
  TrophyIcon,
  VideoIcon,
  CalendarIcon,
  MegaphoneIcon,
  UsersIcon,
  CheckIcon,
  SparklesIcon,
  PlusIcon,
} from "@/components/shared/ui/icons";
import { formatNumber } from "@/lib/utils";
import type { CourseStatus } from "@/db/schema";

interface CourseOverviewPageProps {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({ params }: CourseOverviewPageProps) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const course = await getTeacherCourseWithCurriculum(teacher.id, courseId);

  if (!course) return { title: "Course Not Found" };

  return {
    title: `${course.title} | InsideJibon Educator`,
    description: course.description ?? "Course overview and curriculum details.",
  };
}

const STATUS_TONE: Record<CourseStatus, "muted" | "success" | "warning"> = {
  draft: "muted",
  published: "success",
  archived: "warning",
};

export default async function CourseOverviewPage({
  params,
}: CourseOverviewPageProps) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const t = await getTranslator();
  const course = await getTeacherCourseWithCurriculum(teacher.id, courseId);

  if (!course) {
    notFound();
  }

  const [materials, courseExams, courseAssignments, courseClasses, courseAnnouncements, pendingRequests] = await Promise.all([
    getTeacherCourseMaterials(teacher.id, course.id),
    getTeacherExams(teacher.id, course.id),
    getTeacherAssignments(teacher.id, course.id),
    getTeacherSessionsForCourse(teacher.id, course.id),
    getTeacherAnnouncementsForCourse(teacher.id, course.id),
    getPendingRequestsForCourses([course.id]),
  ]);

  const totalLessons = course.modules.reduce(
    (acc, m) => acc + m.lessons.length,
    0
  );
  const freeLessons = course.modules
    .flatMap((m) => m.lessons)
    .filter((l) => l.isFree).length;

  const formattedCreated = new Intl.DateTimeFormat(
    t.locale === "bn" ? "bn-BD" : "en-US",
    { dateStyle: "medium" }
  ).format(new Date(course.createdAt));

  const formattedPublished = course.publishedAt
    ? new Intl.DateTimeFormat(
        t.locale === "bn" ? "bn-BD" : "en-US",
        { dateStyle: "medium" }
      ).format(new Date(course.publishedAt))
    : null;

  const statusLabel =
    course.status === "draft"
      ? t("common.status.draft")
      : course.status === "published"
        ? t("common.status.published")
        : t("common.status.archived");

  const upcomingClasses = courseClasses.filter((c) => c.status === "upcoming").length;
  const completedClasses = courseClasses.filter((c) => c.status === "completed").length;
  const pinnedAnnouncements = courseAnnouncements.filter((a) => a.isPinned).length;

  return (
    <Container className="py-6 sm:py-8" size="xl">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-ink-500">
        <Link
          href="/teacher/courses"
          className="hover:text-ink-900 transition-colors"
        >
          {t("teacher.courseForm.breadcrumb.courses")}
        </Link>
        <ChevronRightIcon size={12} />
        <span className="truncate font-medium text-ink-700">{course.title}</span>
      </nav>

      {/* Pending Enrollment Requests */}
      {pendingRequests.length > 0 ? (
        <section className="mb-6">
          <SectionHeader
            title={t("enrollment.requests.title")}
            description={t("teacher.dashboard.pendingRequestsSubtitle")}
          />
          <div className="mt-3">
            <PendingRequestsList requests={pendingRequests} />
          </div>
        </section>
      ) : null}

      {/* Course Header Banner */}
      <section className="overflow-hidden rounded-3xl border border-outline-variant bg-gradient-to-br from-primary-container/40 via-surface-0 to-surface-1">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-700">
                /{course.slug}
              </span>
              <Badge tone={STATUS_TONE[course.status]} size="sm">
                {statusLabel}
              </Badge>
              {formattedPublished ? (
                <span className="text-xs text-ink-500">
                  {t("teacher.courseOverview.publishedOn", {
                    date: formattedPublished,
                  })}
                </span>
              ) : null}
            </div>

            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
              {course.title}
            </h1>

            <p className="max-w-3xl text-sm text-ink-500">
              {course.description || t("teacher.courseOverview.noDescription")}
            </p>

            <p className="text-xs text-ink-500">
              {t("teacher.courseOverview.createdOn", { date: formattedCreated })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch xl:flex-row xl:items-center">
            <CoursePublishControl course={course} />
            <Link href={`/teacher/courses/${course.id}/analytics`}>
              <Button variant="outline" size="md" leadingIcon={<ChartIcon size={14} />}>
                Analytics
              </Button>
            </Link>
            <Link href={`/teacher/courses/${course.id}/edit`}>
              <Button variant="outline" size="md" leadingIcon={<SettingsIcon size={14} />}>
                {t("teacher.courseOverview.editSettings")}
              </Button>
            </Link>
            <Link href={`/teacher/courses/${course.id}/builder`}>
              <Button variant="primary" size="md" leadingIcon={<SparklesIcon size={14} />}>
                {t("teacher.courseOverview.openBuilder")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics Grid */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat
          label={t("teacher.courseOverview.stats.modules")}
          value={formatNumber(course.modules.length, { locale: t.locale })}
          icon={<BookIcon size={18} />}
          tone="primary"
        />
        <Stat
          label={t("teacher.courseOverview.stats.lessons")}
          value={formatNumber(totalLessons, { locale: t.locale })}
          icon={<VideoIcon size={18} />}
          tone="primary"
        />
        <Stat
          label={t("teacher.courseOverview.stats.exams")}
          value={formatNumber(courseExams.length, { locale: t.locale })}
          icon={<TrophyIcon size={18} />}
          tone="warning"
        />
        <Stat
          label={t("teacher.assignments.title")}
          value={formatNumber(courseAssignments.length, { locale: t.locale })}
          icon={<ClipboardIcon size={18} />}
          tone="primary"
        />
        <Stat
          label={t("teacher.classes.title")}
          value={formatNumber(courseClasses.length, { locale: t.locale })}
          icon={<CalendarIcon size={18} />}
          tone="primary"
        />
        <Stat
          label={t("teacher.announcements.title")}
          value={formatNumber(courseAnnouncements.length, { locale: t.locale })}
          icon={<MegaphoneIcon size={18} />}
          tone="primary"
        />
        <Stat
          label={t("teacher.courseOverview.stats.materials")}
          value={formatNumber(materials.length, { locale: t.locale })}
          icon={<ClipboardIcon size={18} />}
          tone="neutral"
        />
        <Stat
          label={t("teacher.courseOverview.stats.freePreviews")}
          value={formatNumber(freeLessons, { locale: t.locale })}
          icon={<CheckIcon size={18} />}
          tone="success"
        />
      </section>

      {/* Curriculum Outline */}
      <section className="mt-8">
        <SectionHeader
          title={t("teacher.courseOverview.curriculumTitle")}
          actions={
            <Link
              href={`/teacher/courses/${course.id}/builder`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t("teacher.courseOverview.editInBuilder")} →
            </Link>
          }
        />

        {course.modules.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<BookIcon size={20} />}
              title={t("teacher.courseOverview.noModules")}
              action={
                <Link href={`/teacher/courses/${course.id}/builder`}>
                  <Button variant="primary" size="md" leadingIcon={<SparklesIcon size={14} />}>
                    {t("teacher.courseOverview.openBuilder")}
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {course.modules.map((mod) => (
              <div
                key={mod.id}
                className="rounded-2xl border border-outline-variant bg-surface-0 p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3 border-b border-outline-variant pb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-primary-container px-2 py-0.5 text-[11px] font-bold text-on-primary-container">
                        {t("common.moduleLabelShort", { position: mod.position })}
                      </span>
                      <h3 className="font-display text-sm font-semibold text-ink-900">
                        {mod.title}
                      </h3>
                    </div>
                    {mod.description ? (
                      <p className="mt-1 text-xs text-ink-500">{mod.description}</p>
                    ) : null}
                  </div>

                  <span className="shrink-0 font-mono text-xs text-ink-500">
                    {t.tn("common.lessonCountLower", mod.lessons.length)}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  {mod.lessons.length === 0 ? (
                    <p className="text-xs italic text-ink-500">
                      {t("teacher.courseOverview.noLessonsInModule")}
                    </p>
                  ) : (
                    mod.lessons.map((lesson) => {
                      const lessonMaterials = materials.filter((m) => m.lessonId === lesson.id);
                      return (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between gap-3 rounded-xl bg-surface-1 px-3 py-2 text-xs"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="shrink-0 font-mono text-[11px] text-ink-500">
                              {mod.position}.{lesson.position}
                            </span>
                            <span className="truncate font-medium text-ink-900">
                              {lesson.title}
                            </span>
                            {lesson.isFree ? (
                              <Badge tone="success" size="xs">
                                {t("teacher.courseOverview.freePreviewBadge")}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 items-center gap-3 text-ink-500">
                            {lessonMaterials.length > 0 ? (
                              <span className="flex items-center gap-1 text-[11px]">
                                <ClipboardIcon size={12} />
                                <span>{t.tn("common.fileCount", lessonMaterials.length)}</span>
                              </span>
                            ) : null}

                            {lesson.videoUrl ? (
                              <span className="flex items-center gap-1 text-[11px] text-primary">
                                <VideoIcon size={12} />
                                <span>{t("teacher.courseOverview.videoTag")}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Course Examinations Section */}
      <section className="mt-8">
        <SectionHeader
          title={t("teacher.courseOverview.examsTitle")}
          description={t("teacher.courseOverview.examsSubtitle")}
          actions={
            <Link href={`/teacher/exams/new?courseId=${course.id}`}>
              <Button variant="primary" size="md" leadingIcon={<PlusIcon size={14} />}>
                {t("teacher.courseOverview.createExam")}
              </Button>
            </Link>
          }
        />

        {courseExams.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<TrophyIcon size={20} />}
              title={t("teacher.courseOverview.noExams")}
              description={t("teacher.courseOverview.addFirstAssessment", { course: course.title })}
              action={
                <Link href={`/teacher/exams/new?courseId=${course.id}`}>
                  <Button variant="primary" size="md" leadingIcon={<PlusIcon size={14} />}>
                    {t("teacher.courseOverview.createExam")}
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courseExams.map((exam) => (
              <div
                key={exam.id}
                className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-0 p-4 sm:p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 font-display text-sm font-semibold text-ink-900 line-clamp-1">
                      <Link
                        href={`/teacher/exams/${exam.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {exam.title}
                      </Link>
                    </h3>
                    <Badge
                      tone={
                        exam.status === "draft"
                          ? "muted"
                          : exam.status === "published"
                            ? "success"
                            : "warning"
                      }
                      size="xs"
                    >
                      {exam.status === "draft"
                        ? t("common.status.draft")
                        : exam.status === "published"
                          ? t("common.status.published")
                          : t("common.status.archived")}
                    </Badge>
                  </div>
                  {exam.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-ink-500">
                      {exam.description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-ink-500">
                    <span>{t.tn("common.questionCountLower", exam.questionCount)}</span>
                    <span>•</span>
                    <span>
                      {exam.durationMinutes
                        ? t("student.exam.durationShort", {
                            minutes: exam.durationMinutes,
                          })
                        : t("common.status.untimed")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-outline-variant pt-3">
                  <Link href={`/teacher/exams/${exam.id}/builder`}>
                    <Button variant="primary" size="sm">
                      {exam.status === "draft"
                        ? t("teacher.courseOverview.questionBuilder")
                        : t("teacher.courseOverview.viewPaper")}
                    </Button>
                  </Link>
                  <Link href={`/teacher/exams/${exam.id}`}>
                    <Button variant="outline" size="sm">
                      {t("teacher.courseOverview.overview")}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Course Assignments Section */}
      <section className="mt-8">
        <SectionHeader
          title={t("teacher.courseAssignments.badge")}
          description={t("teacher.courseAssignments.subtitle")}
          actions={
            <>
              <Link
                href={`/teacher/courses/${course.id}/assignments`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {t("teacher.assignments.viewSubmissions")} →
              </Link>
              <Link href={`/teacher/courses/${course.id}/assignments/new`}>
                <Button variant="primary" size="md" leadingIcon={<PlusIcon size={14} />}>
                  {t("teacher.assignments.create")}
                </Button>
              </Link>
            </>
          }
        />

        {courseAssignments.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<ClipboardIcon size={20} />}
              title={t("teacher.courseAssignments.emptyTitle")}
              description={t("teacher.courseAssignments.emptyCta", { course: course.title })}
              action={
                <Link href={`/teacher/courses/${course.id}/assignments/new`}>
                  <Button variant="primary" size="md" leadingIcon={<PlusIcon size={14} />}>
                    {t("teacher.assignments.create")}
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courseAssignments.slice(0, 6).map((asg) => (
              <div
                key={asg.id}
                className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-0 p-4 sm:p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 font-display text-sm font-semibold text-ink-900 line-clamp-1">
                      <Link
                        href={`/teacher/assignments/${asg.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {asg.title}
                      </Link>
                    </h3>
                    <AssignmentStatusBadge status={asg.status} size="sm" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-500">
                    {asg.instructions}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-ink-500">
                    <span>
                      {t("teacher.assignments.pointsCount", { points: asg.maxPoints })}
                    </span>
                    <span>•</span>
                    <span>
                      {t("teacher.assignments.submissionRatio", {
                        submitted: asg.submissionCount,
                        graded: asg.gradedCount,
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-outline-variant pt-3">
                  <Link href={`/teacher/assignments/${asg.id}`}>
                    <Button variant="primary" size="sm">
                      {asg.submissionCount > 0
                        ? t("teacher.assignments.viewSubmissions")
                        : t("teacher.assignments.details")}
                    </Button>
                  </Link>
                  {asg.status === "draft" ? (
                    <Link href={`/teacher/assignments/${asg.id}/edit`}>
                      <Button variant="outline" size="sm">
                        {t("teacher.assignments.editAssignment")}
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Classes Section */}
      <section className="mt-8">
        <SectionHeader
          title={t("teacher.classes.title")}
          actions={
            <Link
              href={`/teacher/courses/${course.id}/classes`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t("student.classes.viewAll")} →
            </Link>
          }
        />
        <div className="mt-4 rounded-2xl border border-outline-variant bg-surface-0 p-5">
          {courseClasses.length === 0 ? (
            <p className="py-2 text-center text-sm text-ink-500">
              {t("teacher.classes.noSessions")}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
              <span className="inline-flex items-center gap-2 text-ink-900">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span>
                  {formatNumber(courseClasses.length, { locale: t.locale })}{" "}
                  {t("teacher.classes.stat.total")}
                </span>
              </span>
              <span className="text-ink-300">•</span>
              <span className="inline-flex items-center gap-2 text-[color:var(--color-success)]">
                <span className="h-2 w-2 rounded-full bg-[color:var(--color-success)]" />
                <span>
                  {formatNumber(upcomingClasses, { locale: t.locale })}{" "}
                  {t("teacher.classes.stat.upcoming")}
                </span>
              </span>
              <span className="text-ink-300">•</span>
              <span className="inline-flex items-center gap-2 text-ink-500">
                <span className="h-2 w-2 rounded-full bg-ink-300" />
                <span>
                  {formatNumber(completedClasses, { locale: t.locale })}{" "}
                  {t("teacher.classes.stat.completed")}
                </span>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Announcements Section */}
      <section className="mt-8">
        <SectionHeader
          title={t("teacher.announcements.title")}
          actions={
            <Link
              href={`/teacher/courses/${course.id}/announcements`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t("student.classes.viewAll")} →
            </Link>
          }
        />
        <div className="mt-4 rounded-2xl border border-outline-variant bg-surface-0 p-5">
          {courseAnnouncements.length === 0 ? (
            <p className="py-2 text-center text-sm text-ink-500">
              {t("teacher.announcements.noAnnouncements")}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
              <span className="inline-flex items-center gap-2 text-ink-900">
                <MegaphoneIcon size={14} />
                <span>
                  {formatNumber(courseAnnouncements.length, { locale: t.locale })}{" "}
                  {t("teacher.announcements.title")}
                </span>
              </span>
              <span className="text-ink-300">•</span>
              <span className="inline-flex items-center gap-2 text-primary">
                <UsersIcon size={14} />
                <span>
                  {formatNumber(pinnedAnnouncements, { locale: t.locale })}{" "}
                  {t("teacher.announcements.pinned")}
                </span>
              </span>
            </div>
          )}
        </div>
      </section>
    </Container>
  );
}
