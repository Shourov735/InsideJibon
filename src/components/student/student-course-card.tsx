import Link from "next/link";
import type { StudentCourseSummary } from "@/types/learning";
import { getTranslator } from "@/i18n/server";
import { Badge } from "@/components/shared/ui/badge";
import { ArrowRightIcon, BookIcon, PlayIcon } from "@/components/shared/ui/icons";

interface StudentCourseCardProps {
  course: StudentCourseSummary;
}

export async function StudentCourseCard({ course }: StudentCourseCardProps) {
  const t = await getTranslator();
  const learnHref = `/student/courses/${course.courseId}/learn`;
  const resumeHref = course.lastLesson
    ? `${learnHref}?lesson=${course.lastLesson.id}`
    : learnHref;

  const status = course.completedAt
    ? t("student.courses.card.statusCompleted")
    : course.progress.percent > 0
      ? t("student.courses.card.statusInProgress")
      : t("student.courses.card.statusNotStarted");

  const statusTone = course.completedAt
    ? "success"
    : course.progress.percent > 0
      ? "primary"
      : "neutral";

  const lastAccessed = course.lastLesson?.lastAccessedAt
    ? new Intl.DateTimeFormat(t.locale === "bn" ? "bn-BD" : "en-US", {
        month: "short",
        day: "numeric",
      }).format(new Date(course.lastLesson.lastAccessedAt))
    : null;

  return (
    <Link
      href={resumeHref}
      className="group flex flex-col overflow-hidden rounded-3xl border border-outline-variant bg-surface-0 shadow-academic transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-academic-lg focus-visible:outline-2 focus-visible:outline-[color:var(--color-info)] focus-visible:outline-offset-2"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2 border-b border-outline-variant">
        {course.thumbnailUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5 text-primary/30">
            <BookIcon size={36} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <Badge tone={statusTone} size="xs" className="font-bold">
            {status}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-display text-base font-semibold leading-snug text-ink-900 line-clamp-1 group-hover:text-primary transition-colors sm:text-lg">
          {course.title}
        </h3>

        <div className="mt-3.5 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-medium text-ink-500">
            <span>
              {t("student.courses.card.lessonRatio", {
                completed: course.progress.completed,
                total: course.progress.total,
              })}
            </span>
            <span className="font-semibold text-ink-900">{course.progress.percent}%</span>
          </div>
          <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${course.progress.percent}%` }}
            />
          </div>
          <span className="text-[11px] text-ink-500 mt-0.5">
            {lastAccessed
              ? t("student.courses.card.lastAccessed", { date: lastAccessed })
              : t("student.courses.card.neverAccessed")}
          </span>
        </div>

        <div className="mt-auto border-t border-outline-variant pt-3.5 flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-ink-900 flex-1">
            {course.teacherName ?? "InsideJibon"}
          </span>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-on-primary transition-colors group-hover:bg-primary/90">
            <PlayIcon size={12} />
            <span>
              {course.lastLesson
                ? t("student.courses.card.continue")
                : t("student.courses.card.start")}
            </span>
            <ArrowRightIcon size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}