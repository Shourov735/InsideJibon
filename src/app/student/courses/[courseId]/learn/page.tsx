import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireStudent } from "@/lib/permissions";
import {
  getLastAccessedLesson,
  getLearningCourse,
  getLessonForStudent,
} from "@/services/learning";
import { LearningSidebar } from "@/components/student/learning-sidebar";
import { LessonCompleteButton } from "@/components/student/lesson-complete-button";
import { LessonVideo } from "@/components/student/lesson-video";
import { ProgressBar } from "@/components/student/progress-bar";

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
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-sm font-medium text-on-surface">
          This course has no lessons yet.
        </p>
        <p className="mt-1 text-sm text-secondary">
          The teacher has not published any lessons. Please check back later.
        </p>
        <Link
          href="/student/courses"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-primary/40"
        >
          Back to My Courses
        </Link>
      </main>
    );
  }

  const lesson = await getLessonForStudent(user.id, activeLessonId);
  if (!lesson) notFound();

  const lessonHref = (lessonId: string) =>
    `/student/courses/${courseId}/learn?lesson=${lessonId}`;

  const isLastLesson =
    lesson.totalLessons > 0 && lesson.completedCount >= lesson.totalLessons - 1;

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col lg:flex-row">
      {/* Mobile curriculum toggle */}
      <details className="border-b border-outline-variant bg-surface-container-lowest lg:hidden">
        <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-sm font-semibold text-on-surface">
          <span>Curriculum · {course.progress.percent}% complete</span>
          <svg
            className="h-4 w-4 text-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div className="max-h-80 overflow-y-auto">
          <LearningSidebar
            course={course}
            courseId={courseId}
            activeLessonId={lesson.lesson.id}
          />
        </div>
      </details>

      {/* Desktop curriculum sidebar */}
      <aside className="hidden w-80 shrink-0 border-r border-outline-variant lg:block">
        <LearningSidebar
          course={course}
          courseId={courseId}
          activeLessonId={lesson.lesson.id}
        />
      </aside>

      {/* Main lesson area */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-surface-container-lowest">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <nav className="flex items-center gap-2 text-xs font-medium text-secondary">
            <Link href="/student" className="hover:text-primary hover:underline">
              Dashboard
            </Link>
            <svg
              className="h-3 w-3 text-outline"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <Link
              href="/student/courses"
              className="hover:text-primary hover:underline"
            >
              My Courses
            </Link>
            <svg
              className="h-3 w-3 text-outline"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <Link
              href={`/student/courses/${courseId}/learn`}
              className="hover:text-primary hover:underline"
            >
              {course.title}
            </Link>
          </nav>

          <div className="mt-4 flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xs">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs font-medium text-secondary">
                <span>
                  {lesson.completedCount} of {lesson.totalLessons} lessons
                </span>
                <span className="font-bold text-primary">
                  {course.progress.percent}%
                </span>
              </div>
              <ProgressBar percent={course.progress.percent} className="mt-2" />
            </div>
            <span className="hidden shrink-0 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 sm:block">
              {course.completedAt ? "Completed" : "In Progress"}
            </span>
          </div>

          {lesson.lesson.videoUrl && (
            <div className="mt-6">
              <LessonVideo
                lessonId={lesson.lesson.id}
                videoUrl={lesson.lesson.videoUrl}
                initialPosition={lesson.progress?.lastPosition ?? null}
              />
            </div>
          )}

          <div className="mt-6 flex flex-col gap-4 border-b border-outline-variant pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold text-secondary">
                Module {lesson.module.position} · Lesson {lesson.lesson.position}
              </p>
              <h1 className="mt-1 text-xl font-bold leading-tight tracking-tight text-on-surface sm:text-2xl">
                {lesson.lesson.title}
              </h1>
              {lesson.lesson.description && (
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {lesson.lesson.description}
                </p>
              )}
            </div>
            <div className="shrink-0">
              <LessonCompleteButton
                lessonId={lesson.lesson.id}
                completed={lesson.progress?.completed ?? false}
              />
            </div>
          </div>

          {lesson.lesson.content && (
            <article className="mt-6">
              <div className="max-w-none whitespace-pre-wrap text-base leading-7 text-on-surface">
                {lesson.lesson.content}
              </div>
            </article>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-outline-variant pt-6 pb-2">
            {lesson.prevLessonId ? (
              <Link
                href={lessonHref(lesson.prevLessonId)}
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-medium text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Previous
              </Link>
            ) : (
              <span />
            )}

            {lesson.nextLessonId ? (
              <Link
                href={lessonHref(lesson.nextLessonId)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
              >
                Next Lesson
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ) : isLastLesson && course.progress.percent < 100 ? (
              <span className="text-sm font-medium text-secondary">
                You have reached the end of this course.
              </span>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}