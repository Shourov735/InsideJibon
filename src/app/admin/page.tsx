import Link from "next/link";

import { requireAdmin } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import { getPlatformStats, getAllUsers, getAllCoursesOverview } from "@/services/admin/admin";
import { getAllPendingRequests } from "@/services/enrollments";
import { UserDirectory } from "@/components/admin/user-directory";
import { PendingRequestsList } from "@/components/shared/pending-requests-list";

import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { SectionHeader } from "@/components/shared/ui/section-header";
import { Stat } from "@/components/shared/ui/stat";
import { Alert } from "@/components/shared/ui/alert";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { ResponsiveTable } from "@/components/shared/ui/responsive-table";
import {
  ArrowRightIcon,
  BookIcon,
  ChartIcon,
  ClipboardIcon,
  TrophyIcon,
  UsersIcon,
} from "@/components/shared/ui/icons";

export const metadata = {
  title: "Admin Dashboard | InsideJibon",
};

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const t = await getTranslator();

  const [stats, users, coursesOverview, pendingRequests] = await Promise.all([
    getPlatformStats(),
    getAllUsers(),
    getAllCoursesOverview(),
    getAllPendingRequests(),
  ]);

  return (
    <Container className="py-6 sm:py-8" size="xl">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            {t("admin.dashboard.badge")}
          </span>
        }
        title={t("admin.dashboard.greeting", { name: admin.name ?? admin.email })}
        description={t("admin.dashboard.welcomeSubtitle")}
      />

      <div className="mt-6">
        <Alert
          tone="info"
          icon={<ChartIcon size={14} />}
          title={t("dashboard.admin.placeholder.title")}
        >
          {t("dashboard.admin.placeholder.description")}
        </Alert>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
        <Stat
          label={t("admin.dashboard.stats.totalUsers")}
          value={stats.users.total}
          hint={`${stats.users.students} S · ${stats.users.teachers} T · ${stats.users.admins} A`}
          icon={<UsersIcon size={18} />}
          tone="primary"
        />
        <Stat
          label={t("admin.dashboard.stats.totalCourses")}
          value={stats.courses.total}
          hint={`${stats.courses.published} published · ${stats.courses.draft} draft`}
          icon={<BookIcon size={18} />}
          tone="warning"
        />
        <Stat
          label={t("admin.dashboard.stats.totalExams")}
          value={stats.totalExams}
          icon={<TrophyIcon size={18} />}
          tone="success"
        />
        <Stat
          label={t("admin.dashboard.stats.totalAssignments")}
          value={stats.totalAssignments}
          icon={<ClipboardIcon size={18} />}
          tone="neutral"
        />
        <Stat
          label={t("admin.dashboard.stats.totalEnrollments")}
          value={stats.totalEnrollments}
          icon={<ChartIcon size={18} />}
          tone="primary"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <section className="mt-10">
        <SectionHeader
          title={t("enrollment.requests.title")}
          description={t("enrollment.requests.adminSubtitle")}
        />
        <div className="mt-3">
          <PendingRequestsList requests={pendingRequests} />
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader
          title={t("admin.users.title")}
          description={t("admin.users.subtitle")}
        />
        <div className="mt-3">
          <UserDirectory users={users} currentUserId={admin.id} />
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader
          title={t("admin.courses.allCourses")}
          description={t("admin.courses.subtitle")}
        />
        <div className="mt-3">
          <ResponsiveTable
            columns={[
              {
                header: t("admin.courses.title"),
                mobileLabel: t("admin.courses.title"),
                mobilePrimary: true,
                cell: (c) => (
                  <Link
                    href={`/courses/${c.id}`}
                    className="font-semibold text-ink-900 hover:text-primary"
                  >
                    {c.title}
                  </Link>
                ),
              },
              {
                header: t("admin.courses.teacher"),
                mobileLabel: t("admin.courses.teacher"),
                cell: (c) => (
                  <span className="text-ink-700">{c.teacherName || "Unknown"}</span>
                ),
              },
              {
                header: t("admin.courses.status"),
                mobileLabel: t("admin.courses.status"),
                cell: (c) =>
                  c.status === "published" ? (
                    <Badge tone="success" size="xs">
                      {c.status}
                    </Badge>
                  ) : (
                    <Badge tone="muted" size="xs">
                      {c.status}
                    </Badge>
                  ),
              },
              {
                header: t("admin.courses.students"),
                mobileLabel: t("admin.courses.students"),
                className: "text-right",
                mobileClassName: "text-right",
                cell: (c) => (
                  <span className="font-mono font-semibold text-ink-900">
                    {c.studentCount.toLocaleString()}
                  </span>
                ),
              },
            ]}
            rows={coursesOverview.map((c) => ({ ...c }))}
            rowKey={(c) => c.id}
            emptyState={<p className="text-sm text-ink-500">{t("admin.courses.noCourses")}</p>}
            mobileLeading={(c) => (
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-ink-900">{c.title}</p>
                <p className="text-xs text-ink-500">
                  {c.teacherName || "Unknown"} · {c.studentCount.toLocaleString()} {t("admin.courses.students").toLowerCase()}
                </p>
              </div>
            )}
            mobileTrailing={(c) =>
              c.status === "published" ? (
                <Badge tone="success" size="xs">{c.status}</Badge>
              ) : (
                <Badge tone="muted" size="xs">{c.status}</Badge>
              )
            }
          />
        </div>
      </section>

      <div className="mt-10 flex justify-center">
        <Link
          href="https://github.com/insidejibon/insidejibon#roadmap"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="md" trailingIcon={<ArrowRightIcon size={14} />}>
            {t("dashboard.admin.placeholder.cta")}
          </Button>
        </Link>
      </div>
    </Container>
  );
}
