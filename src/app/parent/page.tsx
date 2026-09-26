import Link from "next/link";
import { redirect } from "next/navigation";

import { requireParent } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import {
  getLinkedStudents,
} from "@/services/parent/links";
import {
  getParentOverview,
} from "@/services/parent/dashboard";
import { EmptyState } from "@/components/shared/feedback";

import { ParentOverviewClient } from "@/components/parent/parent-overview-client";
import type { DashboardChild, DashboardUpcoming } from "@/components/parent/parent-overview-client";

export const dynamic = "force-dynamic";

export default async function ParentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const user = await requireParent();
  const t = await getTranslator();
  const linked = await getLinkedStudents(user.id);

  if (linked.length === 0) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
            {t("parent.dashboard.title")}
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {t("parent.dashboard.welcome", {
              name:
                user.name?.split(" ")[0] ||
                t("parent.dashboard.guestFallback"),
            })}
          </h1>
          <p className="mt-1 text-sm text-secondary">
            {t("parent.dashboard.introEmpty")}
          </p>
        </div>
        <EmptyState
          icon={
            <svg
              className="h-6 w-6 text-rose-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8 4 4 0 000 8z"
              />
            </svg>
          }
          title={t("parent.dashboard.empty.title")}
          description={t("parent.dashboard.empty.description")}
          action={
            <Link
              href="/parent/invite"
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 transition-colors"
            >
              {t("parent.dashboard.empty.cta")} →
            </Link>
          }
        />
      </main>
    );
  }

  const overview = await getParentOverview(user.id);
  const params = await searchParams;
  const requestedId = params.child;
  const activeChildId =
    overview.children.find((c) => c.child.studentId === requestedId)?.child
      .studentId ?? overview.children[0]?.child.studentId;

  if (!activeChildId) redirect("/parent");

  const childList: DashboardChild[] = overview.children.map((entry) => ({
    studentId: entry.child.studentId,
    studentName: entry.child.studentName,
    currentStreak: entry.child.currentStreak,
    longestStreak: entry.child.longestStreak,
    xpLast7Days: entry.child.xpLast7Days,
    avgGradePct: entry.child.avgGradePct,
    attendancePct: entry.child.attendancePct,
    missingAssignments: entry.child.missingAssignments,
    enrolledCourses: entry.child.enrolledCourses,
    recentGrades: entry.child.recentGrades.map((g) => ({
      label: g.label,
      pct: g.pct,
      submittedAt: g.submittedAt.toISOString(),
    })),
    lastActivityAt: entry.child.lastActivityAt
      ? entry.child.lastActivityAt.toISOString()
      : null,
    upcoming: entry.upcoming.map((u): DashboardUpcoming => ({
      kind: u.kind,
      id: u.id,
      title: u.title,
      when: u.when,
      courseTitle: u.courseTitle,
    })),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
          {t("parent.dashboard.title")}
        </span>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {t("parent.dashboard.welcome", {
            name: user.name?.split(" ")[0] || user.email.split("@")[0],
          })}
        </h1>
        <p className="mt-1 text-sm text-secondary">
          {t("parent.dashboard.intro")}
        </p>
      </div>

      <ParentOverviewClient
        childList={childList}
        activeChildId={activeChildId}
      />
    </main>
  );
}
