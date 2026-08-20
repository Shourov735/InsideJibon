import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { resolveCurrentUser } from "@/lib/auth";
import { isStudentEnrolled } from "@/services/enrollments";
import { getPublishedCourseBySlugWithTeacher } from "@/services/courses";
import { EnrollButton } from "@/components/student/enroll-button";

interface PublicCourseDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PublicCourseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getPublishedCourseBySlugWithTeacher(slug);

  // Draft/archived/unknown courses never reach metadata generation with
  // real course data — return a generic title to avoid leaking anything.
  if (!course) {
    return { title: "Course Not Found" };
  }

  return {
    title: course.title,
    description: course.description ?? undefined,
    openGraph: {
      title: `${course.title} | InsideJibon`,
      description: course.description ?? undefined,
      images: course.thumbnailUrl ? [{ url: course.thumbnailUrl }] : undefined,
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

  const { user } = await resolveCurrentUser();
  const canEnroll = user?.role === "student";
  const enrolled = canEnroll
    ? await isStudentEnrolled(user.id, course.id)
    : false;

  const totalLessons = course.modules.reduce(
    (acc, mod) => acc + mod.lessons.length,
    0
  );
  const freeLessons = course.modules.reduce(
    (acc, mod) => acc + mod.lessons.filter((lesson) => lesson.isFree).length,
    0
  );

  const formattedPublished = course.publishedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(course.publishedAt))
    : null;

  return (
    <div>
      <section className="bg-surface-container-lowest border-b border-outline-variant">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <nav className="flex items-center gap-2 text-xs font-medium text-secondary">
            <Link href="/" className="hover:text-primary hover:underline">
              Home
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
            <Link href="/courses" className="hover:text-primary hover:underline">
              Courses
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
            <span className="truncate text-on-surface">{course.title}</span>
          </nav>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
            {course.thumbnailUrl && (
              <div className="aspect-[16/10] w-full shrink-0 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-high lg:aspect-auto lg:w-96">
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 space-y-3">
              <p className="font-mono text-xs font-semibold text-secondary">
                /{course.slug}
              </p>
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-on-surface sm:text-3xl">
                {course.title}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
                {course.description || "A structured course from InsideJibon."}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  {course.teacher.imageUrl ? (
                    <img
                      src={course.teacher.imageUrl}
                      alt={course.teacher.name || "Teacher"}
                      className="h-9 w-9 rounded-full border border-outline-variant object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high text-xs font-bold text-primary">
                      {(course.teacher.name || "T")
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part.charAt(0).toUpperCase())
                        .join("")}
                    </span>
                  )}
                  <div className="leading-tight">
                    <p className="text-sm font-medium text-on-surface">
                      {course.teacher.name || "InsideJibon Teacher"}
                    </p>
                    <p className="text-xs text-secondary">Instructor</p>
                  </div>
                </div>

                {formattedPublished && (
                  <span className="text-xs text-secondary">
                    Published {formattedPublished}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Modules
              </span>
              <p className="mt-1 text-2xl font-bold text-primary">
                {course.moduleCount}
              </p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Lessons
              </span>
              <p className="mt-1 text-2xl font-bold text-primary">{totalLessons}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Free Previews
              </span>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{freeLessons}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <EnrollButton
              courseId={course.id}
              canEnroll={canEnroll}
              enrolled={enrolled}
            />
            {enrolled && (
              <span className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Enrolled
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-bold tracking-tight text-on-surface">
          Curriculum
        </h2>
        <p className="mt-1 text-sm text-secondary">
          A structured outline of the modules and lessons in this course.
        </p>

        {course.modules.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
            <p className="text-sm text-secondary">
              This course curriculum is being prepared.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {course.modules.map((mod) => (
              <div
                key={mod.id}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary-container px-2 py-0.5 text-xs font-bold text-on-primary-container">
                        Module {mod.position}
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
                  <span className="font-mono text-xs text-secondary">
                    {mod.lessons.length} {mod.lessons.length === 1 ? "lesson" : "lessons"}
                  </span>
                </div>

                <div className="space-y-1.5 pl-2">
                  {mod.lessons.length === 0 ? (
                    <p className="text-xs text-outline italic">
                      Lessons are being prepared for this module.
                    </p>
                  ) : (
                    mod.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2 text-xs"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="font-mono text-[11px] text-secondary">
                            {mod.position}.{lesson.position}
                          </span>
                          <span className="truncate font-medium text-on-surface">
                            {lesson.title}
                          </span>
                          {lesson.isFree && (
                            <span className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                              Free Preview
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
      </section>
    </div>
  );
}