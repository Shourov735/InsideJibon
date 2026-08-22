import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/permissions";
import { getTeacherProfileStats } from "@/services/profile";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { getTranslator } from "@/i18n/server";

export default async function TeacherProfilePage() {
  const user = await requireTeacher();
  const t = await getTranslator();

  const stats = await getTeacherProfileStats(user.id);
  if (!stats) {
    redirect("/");
  }

  const joinDate = user.createdAt
    ? new Intl.DateTimeFormat(t.locale === "bn" ? "bn-BD" : "en-US", { dateStyle: "long" }).format(new Date(user.createdAt))
    : "Lead Educator";

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={user} activeSection="dashboard" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Profile Header Bento Card */}
        <div className="bento-card-static p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary text-xl font-bold font-display shadow-sm">
              {user.name ? user.name.slice(0, 2).toUpperCase() : "TH"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
                  {user.name ?? "Tanvir Hasan Jibon"}
                </h1>
                <span className="rounded-full bg-tertiary-container px-2.5 py-0.5 text-[10px] font-bold text-on-tertiary-container uppercase tracking-wider">
                  EDUCATOR
                </span>
              </div>
              <p className="text-sm text-secondary mt-0.5">{user.email}</p>
              <p className="text-xs text-secondary mt-1">Joined: {joinDate}</p>
            </div>
          </div>
        </div>

        {/* Academic Stats Grid */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">
            Teaching Overview & Statistics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bento-card-static p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                {t("teacher.profile.stats.courses")}
              </span>
              <p className="mt-2 font-display text-3xl font-bold text-primary">{stats.totalCoursesCreated}</p>
              <span className="mt-1 block text-xs text-secondary">Created courses</span>
            </div>

            <div className="bento-card-static p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                {t("teacher.profile.stats.students")}
              </span>
              <p className="mt-2 font-display text-3xl font-bold text-emerald-700">{stats.totalStudents}</p>
              <span className="mt-1 block text-xs text-secondary">Total enrolled learners</span>
            </div>

            <div className="bento-card-static p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Platform Role
              </span>
              <p className="mt-2 font-display text-3xl font-bold text-amber-700">Lead</p>
              <span className="mt-1 block text-xs text-secondary">Curriculum author & instructor</span>
            </div>
          </div>
        </div>

        <div className="bento-card-static p-4 bg-surface-container-low text-xs text-secondary">
          💡 Note: To update your profile photo, name, or credentials, click on your avatar in the top navigation bar.
        </div>
      </main>
    </div>
  );
}
