import { requireAdmin } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import { getPlatformStats, getAllUsers, getAllCoursesOverview } from "@/services/admin/admin";
import { getAllPendingRequests } from "@/services/enrollments";
import { UserDirectory } from "@/components/admin/user-directory";
import { PendingRequestsList } from "@/components/shared/pending-requests-list";
import Link from "next/link";

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
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
            {t("admin.dashboard.badge")}
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {t("admin.dashboard.greeting", { name: admin.name ?? admin.email })}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {t("admin.dashboard.welcomeSubtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("admin.dashboard.stats.totalUsers")}
          </span>
          <p className="mt-2 text-3xl font-bold text-primary">{stats.users.total}</p>
          <span className="mt-1 block text-xs text-on-surface-variant">
            {stats.users.students} S • {stats.users.teachers} T • {stats.users.admins} A
          </span>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("admin.dashboard.stats.totalCourses")}
          </span>
          <p className="mt-2 text-3xl font-bold text-primary">{stats.courses.total}</p>
          <span className="mt-1 block text-xs text-on-surface-variant">
            {stats.courses.published} Pub • {stats.courses.draft} Drf
          </span>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("admin.dashboard.stats.totalExams")}
          </span>
          <p className="mt-2 text-3xl font-bold text-primary">{stats.totalExams}</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("admin.dashboard.stats.totalAssignments")}
          </span>
          <p className="mt-2 text-3xl font-bold text-primary">{stats.totalAssignments}</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("admin.dashboard.stats.totalEnrollments")}
          </span>
          <p className="mt-2 text-3xl font-bold text-primary">{stats.totalEnrollments}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-on-surface">
            {t("enrollment.requests.title")}
          </h2>
          <p className="text-xs text-on-surface-variant">
            {t("enrollment.requests.adminSubtitle")}
          </p>
        </div>
        <PendingRequestsList requests={pendingRequests} />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-on-surface">
            {t("admin.users.title")}
          </h2>
          <p className="text-xs text-on-surface-variant">
            {t("admin.users.subtitle")}
          </p>
        </div>
        <UserDirectory users={users} currentUserId={admin.id} />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-on-surface">
            {t("admin.courses.allCourses")}
          </h2>
          <p className="text-xs text-on-surface-variant">
            {t("admin.courses.subtitle")}
          </p>
        </div>
        
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-2xs overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low text-secondary border-b border-outline-variant">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("admin.courses.title")}</th>
                <th className="px-4 py-3 font-semibold">{t("admin.courses.teacher")}</th>
                <th className="px-4 py-3 font-semibold">{t("admin.courses.status")}</th>
                <th className="px-4 py-3 font-semibold text-right">{t("admin.courses.students")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {coursesOverview.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-secondary">
                    {t("admin.courses.noCourses")}
                  </td>
                </tr>
              ) : (
                coursesOverview.map((course) => (
                  <tr key={course.id} className="hover:bg-surface-container-lowest/50">
                    <td className="px-4 py-3 font-medium text-on-surface">
                      <Link href={`/courses/${course.id}`} className="hover:underline">
                        {course.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-secondary">{course.teacherName || "Unknown"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${course.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container-high text-secondary'}`}>
                        {course.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-on-surface">{course.studentCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}