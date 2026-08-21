import Link from "next/link";
import { notFound } from "next/navigation";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseWithCurriculum } from "@/services/courses";
import { getTeacherCourseMaterials } from "@/services/materials";
import { getTeacherExams } from "@/services/exams";
import { getTeacherAssignments } from "@/services/assignments";
import { getTeacherSessionsForCourse } from "@/services/classes";
import { getTeacherAnnouncementsForCourse } from "@/services/announcements";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { StatusBadge } from "@/components/teacher/status-badge";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { getTranslator } from "@/i18n/server";

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

  const [materials, courseExams, courseAssignments, courseClasses, courseAnnouncements] = await Promise.all([
    getTeacherCourseMaterials(teacher.id, course.id),
    getTeacherExams(teacher.id, course.id),
    getTeacherAssignments(teacher.id, course.id),
    getTeacherSessionsForCourse(teacher.id, course.id),
    getTeacherAnnouncementsForCourse(teacher.id, course.id),
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

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="courses" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-secondary">
          <Link
            href="/teacher/courses"
            className="hover:text-on-surface hover:underline"
          >
            {t("teacher.courseForm.breadcrumb.courses")}
          </Link>
          <svg
            className="h-3 w-3 text-outline"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="text-on-surface truncate">{course.title}</span>
        </div>

        {/* Course Header Banner */}
        <div className="mt-4 flex flex-col gap-6 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between shadow-xs">
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs font-semibold text-secondary">
                /{course.slug}
              </span>
              <StatusBadge
              status={course.status}
              label={course.status === "draft" ? t("common.status.draft") : course.status === "published" ? t("common.status.published") : t("common.status.archived")}
            />
              {formattedPublished && (
                <span className="text-xs text-secondary">
                  {t("teacher.courseOverview.publishedOn", {
                    date: formattedPublished,
                  })}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              {course.title}
            </h1>

            <p className="max-w-3xl text-sm text-on-surface-variant">
              {course.description || t("teacher.courseOverview.noDescription")}
            </p>

            <div className="pt-2 text-xs text-outline">
              {t("teacher.courseOverview.createdOn", {
                date: formattedCreated,
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href={`/teacher/courses/${course.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container hover:text-primary"
            >
              <svg
                className="h-4 w-4 text-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{t("teacher.courseOverview.editSettings")}</span>
            </Link>

            <Link
              href={`/teacher/courses/${course.id}/builder`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span>{t("teacher.courseOverview.openBuilder")}</span>
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.courseOverview.stats.modules")}
            </span>
            <p className="mt-1 text-2xl font-bold text-primary">
              {course.modules.length}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.courseOverview.stats.lessons")}
            </span>
            <p className="mt-1 text-2xl font-bold text-primary">
              {totalLessons}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.courseOverview.stats.exams")}
            </span>
            <p className="mt-1 text-2xl font-bold text-primary">
              {courseExams.length}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.assignments.title")}
            </span>
            <p className="mt-1 text-2xl font-bold text-primary">
              {courseAssignments.length}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.classes.title")}
            </span>
            <p className="mt-1 text-2xl font-bold text-primary">
              {courseClasses.length}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.announcements.title")}
            </span>
            <p className="mt-1 text-2xl font-bold text-primary">
              {courseAnnouncements.length}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.courseOverview.stats.materials")}
            </span>
            <p className="mt-1 text-2xl font-bold text-primary">
              {materials.length}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.courseOverview.stats.freePreviews")}
            </span>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {freeLessons}
            </p>
          </div>
        </div>

        {/* Syllabus / Curriculum Outline */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-on-surface">
              {t("teacher.courseOverview.curriculumTitle")}
            </h2>
            <Link
              href={`/teacher/courses/${course.id}/builder`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("teacher.courseOverview.editInBuilder")} →
            </Link>
          </div>

          {course.modules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
              <p className="text-sm text-secondary">
                {t("teacher.courseOverview.noModules")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {course.modules.map((mod) => (
                <div
                  key={mod.id}
                  className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary-container px-2 py-0.5 text-xs font-bold text-on-primary-container">
                          {t("common.moduleLabelShort", { position: mod.position })}
                        </span>
                        <h3 className="text-sm font-bold text-on-surface">
                          {mod.title}
                        </h3>
                      </div>
                      {mod.description && (
                        <p className="mt-1 text-xs text-secondary">
                          {mod.description}
                        </p>
                      )}
                    </div>

                    <span className="text-xs text-secondary font-mono">
                      {t.tn("common.lessonCountLower", mod.lessons.length)}
                    </span>
                  </div>

                  <div className="space-y-1.5 pl-2">
                    {mod.lessons.length === 0 ? (
                      <p className="text-xs text-outline italic">
                        {t("teacher.courseOverview.noLessonsInModule")}
                      </p>
                    ) : (
                      mod.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-secondary">
                              {mod.position}.{lesson.position}
                            </span>
                            <span className="font-medium text-on-surface">
                              {lesson.title}
                            </span>
                            {lesson.isFree && (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                                {t("teacher.courseOverview.freePreviewBadge")}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-secondary">
                            {materials.some((m) => m.lessonId === lesson.id) && (
                              <span className="flex items-center gap-1 text-[11px] text-secondary">
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                <span>
                                  {t.tn(
                                    "common.fileCount",
                                    materials.filter((m) => m.lessonId === lesson.id).length
                                  )}
                                </span>
                              </span>
                            )}

                            {lesson.videoUrl && (
                              <span className="flex items-center gap-1 text-[11px] text-primary">
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span>{t("teacher.courseOverview.videoTag")}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Course Examinations Section */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">
                {t("teacher.courseOverview.examsTitle")}
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                {t("teacher.courseOverview.examsSubtitle")}
              </p>
            </div>

            <Link
              href={`/teacher/exams/new?courseId=${course.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-on-primary shadow-xs hover:bg-primary-container hover:text-on-primary-container transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>{t("teacher.courseOverview.createExam")}</span>
            </Link>
          </div>

          {courseExams.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center space-y-2">
              <p className="text-sm text-secondary">
                {t("teacher.courseOverview.noExams")}
              </p>
              <div>
                <Link
                  href={`/teacher/exams/new?courseId=${course.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  {t("teacher.courseOverview.addFirstAssessment", {
                    course: course.title,
                  })}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courseExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-on-surface line-clamp-1">
                        <Link
                          href={`/teacher/exams/${exam.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {exam.title}
                        </Link>
                      </h3>
                      <StatusBadge
                        status={exam.status}
                        label={exam.status === "draft" ? t("common.status.draft") : exam.status === "published" ? t("common.status.published") : t("common.status.archived")}
                      />
                    </div>
                    {exam.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                        {exam.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium text-secondary">
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
                    <Link
                      href={`/teacher/exams/${exam.id}/builder`}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary shadow-2xs hover:bg-primary-container transition-colors"
                    >
                      {exam.status === "draft"
                        ? t("teacher.courseOverview.questionBuilder")
                        : t("teacher.courseOverview.viewPaper")}
                    </Link>
                    <Link
                      href={`/teacher/exams/${exam.id}`}
                      className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1.5 text-xs font-medium text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
                    >
                      {t("teacher.courseOverview.overview")}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Course Assignments Section */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">
                {t("teacher.courseAssignments.badge")}
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                {t("teacher.courseAssignments.subtitle")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/teacher/courses/${course.id}/assignments`}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {t("teacher.assignments.viewSubmissions")} →
              </Link>
              <Link
                href={`/teacher/courses/${course.id}/assignments/new`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-on-primary shadow-xs hover:bg-primary-container hover:text-on-primary-container transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>{t("teacher.assignments.create")}</span>
              </Link>
            </div>
          </div>

          {courseAssignments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center space-y-2">
              <p className="text-sm text-secondary">
                {t("teacher.courseAssignments.emptyTitle")}
              </p>
              <div>
                <Link
                  href={`/teacher/courses/${course.id}/assignments/new`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  {t("teacher.courseAssignments.emptyCta", { course: course.title })}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courseAssignments.slice(0, 6).map((asg) => (
                <div
                  key={asg.id}
                  className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-on-surface line-clamp-1">
                        <Link
                          href={`/teacher/assignments/${asg.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {asg.title}
                        </Link>
                      </h3>
                      <AssignmentStatusBadge
                        status={asg.status}
                        size="sm"
                      />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                      {asg.instructions}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium text-secondary">
                      <span>{t("teacher.assignments.pointsCount", { points: asg.maxPoints })}</span>
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
                    <Link
                      href={`/teacher/assignments/${asg.id}`}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary shadow-2xs hover:bg-primary-container transition-colors"
                    >
                      {asg.submissionCount > 0
                        ? t("teacher.assignments.viewSubmissions")
                        : t("teacher.assignments.details")}
                    </Link>
                    {asg.status === "draft" && (
                      <Link
                        href={`/teacher/assignments/${asg.id}/edit`}
                        className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1.5 text-xs font-medium text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
                      >
                        {t("teacher.assignments.editAssignment")}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Classes Section */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">
                {t("teacher.classes.title")}
              </h2>
            </div>
            <Link
              href={`/teacher/courses/${course.id}/classes`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("student.classes.viewAll")} →
            </Link>
          </div>
          
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            {courseClasses.length === 0 ? (
              <p className="text-sm text-secondary text-center py-4">
                {t("teacher.classes.noSessions")}
              </p>
            ) : (
              <div className="flex items-center gap-4 text-sm font-medium">
                <span className="text-on-surface">
                  {courseClasses.length} {t("teacher.classes.stat.total")}
                </span>
                <span className="text-secondary">•</span>
                <span className="text-green-600">
                  {courseClasses.filter(c => c.status === "upcoming").length} {t("teacher.classes.stat.upcoming")}
                </span>
                <span className="text-secondary">•</span>
                <span className="text-on-surface-variant">
                  {courseClasses.filter(c => c.status === "completed").length} {t("teacher.classes.stat.completed")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Announcements Section */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">
                {t("teacher.announcements.title")}
              </h2>
            </div>
            <Link
              href={`/teacher/courses/${course.id}/announcements`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("student.classes.viewAll")} →
            </Link>
          </div>
          
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            {courseAnnouncements.length === 0 ? (
              <p className="text-sm text-secondary text-center py-4">
                {t("teacher.announcements.noAnnouncements")}
              </p>
            ) : (
              <div className="flex items-center gap-4 text-sm font-medium">
                <span className="text-on-surface">
                  {courseAnnouncements.length} {t("teacher.announcements.title")}
                </span>
                <span className="text-secondary">•</span>
                <span className="text-primary">
                  {courseAnnouncements.filter(a => a.isPinned).length} {t("teacher.announcements.pinned")}
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
