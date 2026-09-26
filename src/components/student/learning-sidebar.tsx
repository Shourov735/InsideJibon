import Link from "next/link";

import type { LearningCourse } from "@/types/learning";
import { useTranslations } from "@/i18n/client";
import { Progress } from "@/components/shared/ui/progress";
import { Badge } from "@/components/shared/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  ClipboardIcon,
  PlayIcon,
  TrophyIcon,
} from "@/components/shared/ui/icons";

interface LearningSidebarProps {
  course: LearningCourse;
  courseId: string;
  activeLessonId: string | null;
  /** When true, renders a more compact view (used in the mobile drawer). */
  compact?: boolean;
}

/**
 * Curriculum navigation for the learning workspace. Pure component —
 * rendered both on the server (desktop layout) and inside the mobile
 * drawer (client component). Links point at `/student/courses/[courseId]/learn?lesson=<id>`.
 */
export function LearningSidebar({
  course,
  courseId,
  activeLessonId,
  compact = false,
}: LearningSidebarProps) {
  const { t } = useTranslations();

  return (
    <nav
      aria-label={t("student.learn.curriculumAria")}
      className="flex h-full w-full flex-col bg-surface-0"
    >
      <div className={cn("border-b border-outline-variant", compact ? "p-3" : "p-4")}>
        <h2 className="line-clamp-1 text-sm font-semibold text-ink-900">{course.title}</h2>
        <p className="mt-1 text-xs text-ink-500">
          {t("student.learn.sidebarProgress", {
            completed: course.progress.completed,
            total: course.progress.total,
            percent: course.progress.percent,
          })}
        </p>
        <Progress value={course.progress.percent} size="sm" className="mt-2" />
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        <SidebarLink
          href={`/student/courses/${courseId}/assignments`}
          icon={<ClipboardIcon size={16} />}
          label={t("student.learn.courseAssignments")}
          badge={t("student.learn.assignmentsBadge")}
          tone="primary"
        />
        <SidebarLink
          href={`/student/courses/${courseId}/exams`}
          icon={<TrophyIcon size={16} />}
          label={t("student.learn.courseExaminations")}
          badge={t("student.learn.testsBadge")}
          tone="warning"
        />

        <div className="mt-2 border-t border-outline-variant px-2 pt-3">
          {course.modules.map((module) => (
            <div key={module.id} className="mb-3">
              <div className="flex items-center gap-2 px-2 pb-1.5">
                <span className="rounded-full bg-primary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-primary-container">
                  Module {module.position}
                </span>
                <h3 className="truncate text-xs font-semibold text-ink-900">{module.title}</h3>
              </div>
              <ul>
                {module.lessons.map((lesson) => {
                  const active = lesson.id === activeLessonId;
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/student/courses/${courseId}/learn?lesson=${lesson.id}`}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex items-center gap-2 rounded-xl px-2 py-2 text-xs transition-colors",
                          active
                            ? "bg-primary-container text-on-primary-container"
                            : "text-ink-700 hover:bg-surface-1",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                            lesson.completed
                              ? "bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]"
                              : active
                                ? "bg-primary text-on-primary"
                                : "bg-surface-2 text-ink-700",
                          )}
                        >
                          {lesson.completed ? (
                            <CheckIcon size={12} />
                          ) : (
                            `${module.position}.${lesson.position}`
                          )}
                        </span>
                        <span className="flex-1 truncate">{lesson.title}</span>
                        {lesson.completed ? null : active ? (
                          <PlayIcon size={12} className="shrink-0" />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  badge,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  tone?: "primary" | "warning";
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-l-2 border-transparent px-4 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:bg-surface-1 hover:text-ink-900"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-ink-500">{icon}</span>
        <span>{label}</span>
      </div>
      {badge ? (
        <Badge tone={tone} size="xs">
          {badge}
        </Badge>
      ) : null}
    </Link>
  );
}
