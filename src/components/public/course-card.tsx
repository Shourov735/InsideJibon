import Link from "next/link";
import Image from "next/image";
import type { PublicCourseSummary } from "@/types/course";
import { CategoryBadge } from "@/components/shared/category-badge";
import { formatBDT } from "@/lib/utils";
import { Badge } from "@/components/shared/ui/badge";
import { BookIcon, PlayIcon } from "@/components/shared/ui/icons";

interface PublicCourseCardProps {
  course: PublicCourseSummary;
  enrollmentStatus?: "active" | "pending" | "rejected" | null;
  /** When true, the course appears in at least one published bundle. */
  inBundle?: boolean;
}

function TeacherAvatar({ course }: PublicCourseCardProps) {
  const name = course.teacher.name?.trim();
  const avatarSrc = course.teacher.imageUrl || "/jibon.jpg";

  return (
    <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-outline-variant bg-surface-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarSrc}
        alt={name || "Tanvir Hasan Jibon"}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

export function PublicCourseCard({ course, enrollmentStatus, inBundle }: PublicCourseCardProps) {
  const isPaid = course.requiresPayment && course.priceBdt;
  const priceLabel = !isPaid
    ? "Free"
    : inBundle
      ? "In a bundle"
      : formatBDT(Number(course.priceBdt));

  const priceTone = !isPaid
    ? "success"
    : inBundle
      ? "warning"
      : "primary";

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-outline-variant bg-surface-0 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.12)] focus-visible:outline-2 focus-visible:outline-[color:var(--color-info)] focus-visible:outline-offset-2"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5 text-primary/30">
            <BookIcon size={36} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {enrollmentStatus === "active" ? (
            <Badge tone="success" size="xs">
              Enrolled
            </Badge>
          ) : null}
          {enrollmentStatus === "pending" ? (
            <Badge tone="warning" size="xs">
              Pending
            </Badge>
          ) : null}
        </div>
        <div className="absolute right-3 top-3">
          {course.category ? <CategoryBadge category={course.category} /> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 font-display text-base font-semibold leading-snug text-ink-900 line-clamp-2 group-hover:text-primary sm:text-lg">
            {course.title}
          </h3>
          <Badge tone={priceTone} size="xs" className="shrink-0">
            {priceLabel}
          </Badge>
        </div>

        {course.description ? (
          <p className="mt-2 text-sm text-ink-500 line-clamp-2">{course.description}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <TeacherAvatar course={course} />
            <span className="truncate text-xs font-semibold text-ink-900">
              {course.teacher.name || "Tanvir Hasan Jibon"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs font-semibold text-ink-500">
            <span className="flex items-center gap-1" aria-label="modules">
              <BookIcon size={12} />
              {course.moduleCount}
            </span>
            <span className="flex items-center gap-1" aria-label="lessons">
              <PlayIcon size={12} />
              {course.lessonCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
