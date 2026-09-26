"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/client";
import { useMemo, useState } from "react";

export interface DashboardChild {
  studentId: string;
  studentName: string | null;
  currentStreak: number;
  longestStreak: number;
  xpLast7Days: number;
  avgGradePct: number | null;
  attendancePct: number | null;
  missingAssignments: number;
  enrolledCourses: Array<{
    courseId: string;
    courseTitle: string;
    completionPct: number;
  }>;
  recentGrades: Array<{ label: string; pct: number; submittedAt: string }>;
  lastActivityAt: string | null;
  upcoming: DashboardUpcoming[];
}

export interface DashboardUpcoming {
  kind: "assignment" | "exam" | "live_class";
  id: string;
  title: string;
  when: string;
  courseTitle?: string;
}

interface ParentOverviewClientProps {
  childList: DashboardChild[];
  activeChildId: string;
}

/**
 * R7 §4.1 — Parent overview client.
 *
 * Renders the child-switcher, summary cards, upcoming deadlines,
 * grade trend, and attendance strip. All data is server-resolved;
 * the client component only manages child-switching state and links
 * to /parent?child=<id> so SSR is consistent on reload.
 */
export function ParentOverviewClient({
  childList,
  activeChildId,
}: ParentOverviewClientProps) {
  const { t, tn, locale } = useTranslations();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(activeChildId);

  const active = useMemo(
    () => childList.find((c) => c.studentId === selectedId) ?? childList[0],
    [childList, selectedId]
  );

  if (!active) return null;

  return (
    <div className="space-y-6">
      {/* Child switcher */}
      <div className="bento-card-static p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
              {t("parent.dashboard.switchChild")}
            </p>
            <p className="mt-1 font-display text-base font-bold text-on-surface">
              {active.studentName ?? t("parent.dashboard.guestFallback")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {childList.map((child) => {
              const isActive = child.studentId === selectedId;
              return (
                <button
                  key={child.studentId}
                  type="button"
                  onClick={() => {
                    setSelectedId(child.studentId);
                    router.replace(`/parent?child=${child.studentId}`, {
                      scroll: false,
                    });
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-rose-600 bg-rose-600 text-white"
                      : "border-outline-variant bg-surface-0 text-secondary hover:bg-rose-50 hover:text-rose-700"
                  }`}
                  aria-pressed={isActive}
                >
                  {child.studentName ?? t("parent.dashboard.guestFallback")}
                </button>
              );
            })}
            <Link
              href="/parent/invite"
              className="rounded-full border border-dashed border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              {t("parent.dashboard.inviteAnother")}
            </Link>
          </div>
        </div>
      </div>

      {/* Top stats trio */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("parent.cards.streak")}
          value={`${active.currentStreak}`}
          sub={
            active.longestStreak > 0
              ? t("parent.cards.streakBest", { days: active.longestStreak })
              : t("parent.cards.streakNone")
          }
          accent="rose"
        />
        <StatCard
          label={t("parent.cards.xpWeek")}
          value={`${active.xpLast7Days}`}
          sub={t("parent.cards.xpWeekSub")}
          accent="emerald"
        />
        <StatCard
          label={t("parent.cards.avgGrade")}
          value={active.avgGradePct !== null ? `${active.avgGradePct}%` : "—"}
          sub={t("parent.cards.avgGradeSub")}
          accent="amber"
        />
      </section>

      {/* Upcoming + Alerts */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="bento-card-static p-5 lg:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3">
            {t("parent.upcoming.title")}
          </h3>
          {active.upcoming.length === 0 ? (
            <p className="text-sm text-secondary">
              {t("parent.upcoming.empty")}
            </p>
          ) : (
            <ul className="space-y-2">
              {active.upcoming.map((item) => (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3"
                >
                  <span
                    className={`mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.kind === "live_class"
                        ? "bg-indigo-100 text-indigo-700"
                        : item.kind === "assignment"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {item.kind === "live_class"
                      ? t("parent.upcoming.kindLive")
                      : item.kind === "assignment"
                      ? t("parent.upcoming.kindAssignment")
                      : t("parent.upcoming.kindExam")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-on-surface">
                      {item.title}
                    </p>
                    {item.courseTitle ? (
                      <p className="mt-0.5 truncate text-[11px] text-secondary">
                        {item.courseTitle}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-[11px] text-secondary">
                      {formatDate(item.when, locale)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bento-card-static p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3">
            {t("parent.alerts.title")}
          </h3>
          <ul className="space-y-2 text-sm">
            {active.missingAssignments > 0 ? (
              <li className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                {tn("parent.alerts.missingAssignment", active.missingAssignments)}
              </li>
            ) : null}
            {active.attendancePct !== null && active.attendancePct < 60 ? (
              <li className="rounded-lg bg-rose-50 px-3 py-2 text-rose-800">
                {t("parent.alerts.attendanceDropped", {
                  pct: active.attendancePct,
                })}
              </li>
            ) : null}
            {active.avgGradePct !== null && active.avgGradePct < 50 ? (
              <li className="rounded-lg bg-rose-50 px-3 py-2 text-rose-800">
                {t("parent.alerts.examFail", {
                  pct: active.avgGradePct,
                })}
              </li>
            ) : null}
            {active.missingAssignments === 0 &&
              (active.attendancePct === null || active.attendancePct >= 60) &&
              (active.avgGradePct === null || active.avgGradePct >= 50) ? (
              <li className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
                {t("parent.alerts.allGood")}
              </li>
            ) : null}
          </ul>
        </div>
      </section>

      {/* Grade trend + attendance + courses */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="bento-card-static p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3">
            {t("parent.gradeTrend.title")}
          </h3>
          <GradeSparkline grades={active.recentGrades} locale={locale} />
        </div>

        <div className="bento-card-static p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3">
            {t("parent.cards.attendance")}
          </h3>
          <p className="font-display text-3xl font-bold text-rose-700">
            {active.attendancePct !== null ? `${active.attendancePct}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {t("parent.attendance.subtitle")}
          </p>
        </div>

        <div className="bento-card-static p-5 lg:col-span-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3">
            {t("parent.courses.title")}
          </h3>
          {active.enrolledCourses.length === 0 ? (
            <p className="text-sm text-secondary">
              {t("parent.courses.empty")}
            </p>
          ) : (
            <ul className="space-y-3">
              {active.enrolledCourses.slice(0, 4).map((course) => (
                <li key={course.courseId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate font-semibold text-on-surface">
                      {course.courseTitle}
                    </span>
                    <span className="text-rose-700">{course.completionPct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-rose-100">
                    <div
                      className="h-full rounded-full bg-rose-600"
                      style={{ width: `${course.completionPct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard(props: {
  label: string;
  value: string;
  sub: string;
  accent: "rose" | "emerald" | "amber";
}) {
  const accentClass =
    props.accent === "emerald"
      ? "text-emerald-700"
      : props.accent === "amber"
      ? "text-amber-700"
      : "text-rose-700";
  return (
    <div className="bento-card-static p-5">
      <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
        {props.label}
      </span>
      <p className={`mt-2 font-display text-3xl font-bold ${accentClass}`}>
        {props.value}
      </p>
      <p className="mt-1 text-xs text-secondary">{props.sub}</p>
    </div>
  );
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(
      locale === "bn" ? "bn-BD" : "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(new Date(iso));
  } catch {
    return iso;
  }
}

function GradeSparkline({
  grades,
  locale,
}: {
  grades: Array<{ label: string; pct: number; submittedAt: string }>;
  locale: string;
}) {
  if (grades.length === 0) {
    return (
      <p className="text-sm text-secondary">
        {locale === "bn"
          ? "এখনও কোনো গ্রেড নেই"
          : "No grades recorded yet"}
      </p>
    );
  }
  // Bars are rendered as plain divs to avoid pulling a chart library.
  // Heights are normalized to the visible window (50–100%).
  const min = 40;
  const max = 100;
  return (
    <div className="space-y-3">
      <div className="flex h-24 items-end gap-1">
        {grades.map((g, idx) => {
          const height = Math.max(
            4,
            Math.round(((g.pct - min) / (max - min)) * 96)
          );
          return (
            <div
              key={`${g.submittedAt}-${idx}`}
              className="flex-1 rounded-t bg-gradient-to-t from-rose-500 to-rose-300"
              style={{ height: `${height}%` }}
              title={`${g.label} — ${g.pct}%`}
            />
          );
        })}
      </div>
      <ul className="space-y-1 text-[11px] text-secondary">
        {grades.slice(0, 3).map((g, idx) => (
          <li
            key={`${g.submittedAt}-row-${idx}`}
            className="flex items-center justify-between"
          >
            <span className="truncate">{g.label}</span>
            <span className="font-semibold text-rose-700">{g.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
