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

import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { Button } from "@/components/shared/ui/button";
import { ArrowRightIcon, UsersIcon } from "@/components/shared/ui/icons";

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
      <Container className="py-8 sm:py-12" size="md">
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-1.5 text-rose-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-600" />
              {t("parent.dashboard.title")}
            </span>
          }
          title={t("parent.dashboard.welcome", {
            name:
              user.name?.split(" ")[0] ||
              t("parent.dashboard.guestFallback"),
          })}
          description={t("parent.dashboard.introEmpty")}
        />
        <div className="mt-8">
          <EmptyState
            icon={<UsersIcon size={20} className="text-rose-600" />}
            title={t("parent.dashboard.empty.title")}
            description={t("parent.dashboard.empty.description")}
            action={
              <Link href="/parent/invite">
                <Button variant="primary" size="md" trailingIcon={<ArrowRightIcon size={14} />}>
                  {t("parent.dashboard.empty.cta")}
                </Button>
              </Link>
            }
          />
        </div>
      </Container>
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
    <Container className="py-6 sm:py-8" size="xl">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-rose-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-600" />
            {t("parent.dashboard.title")}
          </span>
        }
        title={t("parent.dashboard.welcome", {
          name: user.name?.split(" ")[0] || user.email.split("@")[0],
        })}
        description={t("parent.dashboard.intro")}
      />

      <div className="mt-6">
        <ParentOverviewClient
          childList={childList}
          activeChildId={activeChildId}
        />
      </div>
    </Container>
  );
}
