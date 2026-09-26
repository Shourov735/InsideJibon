import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireStudent } from "@/lib/permissions";
import {
  getLastAccessedLesson,
  getLearningCourse,
  getLessonForStudent,
} from "@/services/learning";
import { getLessonMaterialsForStudent } from "@/services/materials";
import { listLessonQa } from "@/services/qna/threads";
import type { QaQuestionView } from "@/components/student/qna/qna-panel";
import { getStudentSessionsForCourse } from "@/services/classes/classes";
import { getStudentAnnouncementsForCourse } from "@/services/announcements/announcements";
import { LearningSidebar } from "@/components/student/learning-sidebar";
import { LearnMobileCurriculum } from "@/components/student/learn-mobile-curriculum";
import { LessonCompleteButton } from "@/components/student/lesson-complete-button";
import { LessonResources } from "@/components/student/lesson-resources";
import { LessonVideo } from "@/components/student/lesson-video";
import { LearnPageTabs } from "@/components/student/learn-tabs";
import { StreakXpCard } from "@/components/student/gamification/StreakXpCard";
import { TutorSheet, type TutorHistoryMessage } from "@/components/student/tutor/tutor-sheet";
import { listTutorHistory, readBudget } from "@/services/ai/tutor";
import { getLessonVideoForStudent } from "@/services/lessons/video";
import { getTranslator } from "@/i18n/server";

import { Badge } from "@/components/shared/ui/badge";
import { Progress } from "@/components/shared/ui/progress";
import { cn } from "@/lib/utils";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronRightIcon,
  HomeIcon,
  PlayIcon,
} from "@/components/shared/ui/icons";

interface LearnPageProps {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: LearnPageProps): Promise<Metadata> {
  const { courseId } = await params;
  if (!UUID_RE.test(courseId)) return { title: "Course Not Found" };

  const user = await requireStudent();
  const course = await getLearningCourse(user.id, courseId);
  return { title: course ? `${course.title} — Learn` : "Course Not Found" };
}

export default async function LearnPage({
  params,
  searchParams,
}: LearnPageProps) {
  const { courseId } = await params;
  const { lesson: lessonParam } = await searchParams;

  const user = await requireStudent();
  const t = await getTranslator();
  const course = await getLearningCourse(user.id, courseId);
  if (!course) notFound();

  const allLessons = course.modules.flatMap((m) => m.lessons);
  let activeLessonId: string | null = null;

  if (lessonParam && UUID_RE.test(lessonParam)) {
    const inCourse = allLessons.some((l) => l.id === lessonParam);
    if (inCourse) activeLessonId = lessonParam;
  }

  if (!activeLessonId) {
    const lastAccessed = await getLastAccessedLesson(user.id, courseId);
    activeLessonId =
      lastAccessed?.id ?? allLessons[0]?.id ?? null;
  }

  if (!activeLessonId) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-1 text-ink-500">
          <PlayIcon size={24} />
        </div>
        <h1 className="mt-4 font-display text-lg font-semibold text-ink-900">
          {t("student.learn.noLessons")}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {t("student.learn.noLessonsDesc")}
        </p>
        <Link
          href="/student/courses"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary/90"
        >
          {t("student.learn.backToMyCourses")}
          <ArrowRightIcon size={14} />
        </Link>
      </div>
    );
  }

  const lesson = await getLessonForStudent(user.id, activeLessonId);
  if (!lesson) notFound();

  const [materials, sessions, announcements, rawQaThreads, tutorHistory, tutorBudget, videoData] =
    await Promise.all([
      getLessonMaterialsForStudent(user.id, activeLessonId),
      getStudentSessionsForCourse(user.id, courseId),
      getStudentAnnouncementsForCourse(user.id, courseId),
      listLessonQa({
        lessonId: activeLessonId,
        currentUserId: user.id,
        currentUserRole: user.role,
      }),
      listTutorHistory({
        userId: user.id,
        courseId,
        lessonId: activeLessonId,
        limit: 10,
      }),
      readBudget(user.id),
      getLessonVideoForStudent(activeLessonId, user.id).catch(() => null),
    ]);
  // The DB column is `text` so drizzle widens `kind` to `string`; the schema
  // enum ('question' | 'answer' | 'comment' | 'comment_legacy') is enforced
  // by the migration CHECK constraint, so narrowing here is safe.
  const qaThreads = rawQaThreads as unknown as QaQuestionView[];
  const tutorMessages: TutorHistoryMessage[] = tutorHistory.map((m) => ({
    id: m.id,
    question: m.question,
    answer: m.answer,
    citations: m.citations,
    lang: m.lang,
    createdAt: m.createdAt.toISOString(),
  }));

  const lessonHref = (lessonId: string) =>
    `/student/courses/${courseId}/learn?lesson=${lessonId}`;

  const isLastLesson =
    lesson.totalLessons > 0 && lesson.completedCount >= lesson.totalLessons - 1;

  const isCompleted = lesson.progress?.completed ?? false;
  const lessonsProgressTone = course.progress.percent >= 100
    ? "success"
    : course.completedAt
      ? "success"
      : "primary";

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col lg:flex-row">
      {/* Desktop curriculum sidebar */}
      <aside className="hidden w-80 shrink-0 border-r border-outline-variant lg:block">
        <LearningSidebar
          course={course}
          courseId={courseId}
          activeLessonId={lesson.lesson.id}
        />
      </aside>

      {/* Main lesson area */}
      <main id="main-content" className="flex min-w-0 flex-1 flex-col bg-surface-0">
        {/* Mobile curriculum trigger — sticky on small screens */}
        <div className="sticky top-0 z-30 border-b border-outline-variant bg-surface-0/95 backdrop-blur lg:hidden">
          <LearnMobileCurriculum
            course={course}
            courseId={courseId}
            activeLessonId={lesson.lesson.id}
          />
        </div>

        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 overflow-hidden text-xs font-medium text-ink-500"
          >
            <Link
              href="/student"
              className="inline-flex shrink-0 items-center gap-1 hover:text-ink-900"
            >
              <HomeIcon size={12} />
              <span className="hidden sm:inline">{t("nav.student.dashboard")}</span>
            </Link>
            <ChevronRightIcon size={12} className="shrink-0 text-outline" />
            <Link
              href="/student/courses"
              className="shrink-0 truncate hover:text-ink-900"
            >
              {t("nav.student.courses")}
            </Link>
            <ChevronRightIcon size={12} className="shrink-0 text-outline" />
            <Link
              href={`/student/courses/${courseId}/learn`}
              className="truncate hover:text-ink-900"
              title={course.title}
            >
              {course.title}
            </Link>
          </nav>

          {/* Progress / status card */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-outline-variant bg-surface-0 p-3.5 sm:gap-4 sm:p-4">
            <div className="min-w-0 flex-1">
              <Progress
                value={course.progress.percent}
                size="sm"
                tone={lessonsProgressTone}
                label={t("student.learn.lessonsProgress", {
                  completed: lesson.completedCount,
                  total: lesson.totalLessons,
                })}
                showLabel
              />
            </div>
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <Badge tone="success" size="sm">
                  <CheckIcon size={12} />
                  {t("common.status.completed")}
                </Badge>
              ) : course.completedAt ? (
                <Badge tone="success" size="sm">
                  {t("common.status.completed")}
                </Badge>
              ) : (
                <Badge tone="primary" size="sm">
                  {t("common.status.inProgress")}
                </Badge>
              )}
            </div>
          </div>

          {/* R5 — compact streak / XP / league card on the lesson page */}
          <div className="mt-4">
            <StreakXpCard userId={user.id} compact />
          </div>

          {/* Video */}
          {(videoData?.video || lesson.lesson.videoUrl) ? (
            <div className="mt-6">
              <div className="overflow-hidden rounded-3xl border border-outline-variant bg-ink-900 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)]">
                <div className="relative aspect-video w-full">
                  <LessonVideo
                    lessonId={lesson.lesson.id}
                    video={videoData?.video ?? null}
                    descriptor={videoData?.video ?? null}
                    videoProvider={videoData?.provider ?? (lesson.lesson.videoUrl ? "external" : "youtube")}
                    youtubeVideoId={videoData?.youtubeVideoId}
                    videoUrl={videoData?.videoUrl ?? lesson.lesson.videoUrl}
                    initialPosition={lesson.progress?.lastPosition ?? null}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Lesson header */}
          <div className="mt-6 flex flex-col gap-4 border-b border-outline-variant pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-500">
                {t("common.moduleLessonLabel", {
                  module: lesson.module.position,
                  lesson: lesson.lesson.position,
                })}
              </p>
              <h1 className="mt-1.5 font-display text-xl font-bold leading-tight tracking-tight text-ink-900 sm:text-2xl">
                {lesson.lesson.title}
              </h1>
              {lesson.lesson.description ? (
                <p className="mt-2 text-sm leading-relaxed text-ink-500 sm:text-base">
                  {lesson.lesson.description}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-row items-stretch gap-2 sm:flex-col sm:items-end">
              <TutorSheet
                courseId={courseId}
                lessonId={lesson.lesson.id}
                initialHistory={tutorMessages}
                initialBudget={tutorBudget}
              />
              <LessonCompleteButton
                lessonId={lesson.lesson.id}
                completed={isCompleted}
              />
            </div>
          </div>

          {/* Lesson content */}
          {lesson.lesson.content ? (
            <article className="mt-6">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-2xl border border-outline-variant bg-surface-0 p-5 text-base leading-7 text-ink-900 sm:p-6">
                {lesson.lesson.content}
              </div>
            </article>
          ) : null}

          {/* Lesson Materials / Resources */}
          <LessonResources materials={materials} className="mt-8" />

          {/* Classes & Announcements Tabs */}
          <LearnPageTabs
            sessions={sessions}
            announcements={announcements}
            qaThreads={qaThreads}
            lessonId={activeLessonId}
            courseId={courseId}
            currentUserId={user.id}
            currentUserRole={user.role}
          />

          {/* Prev / Next nav */}
          <div
            className={cn(
              "mt-8 flex flex-col-reverse items-stretch gap-2 border-t border-outline-variant pt-6 sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            {lesson.prevLessonId ? (
              <Link
                href={lessonHref(lesson.prevLessonId)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-0 px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-surface-1 sm:justify-start"
              >
                <ArrowRightIcon
                  size={14}
                  className="rotate-180 text-ink-500"
                />
                <span>{t("student.learn.previous")}</span>
              </Link>
            ) : (
              <span aria-hidden />
            )}

            <div className="flex items-center justify-end">
              {lesson.nextLessonId ? (
                <Link
                  href={lessonHref(lesson.nextLessonId)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
                >
                  {t("student.learn.nextLesson")}
                  <ArrowRightIcon size={14} />
                </Link>
              ) : isLastLesson && course.progress.percent < 100 ? (
                <span className="text-sm font-medium text-ink-500">
                  {t("student.learn.courseEnd")}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
