import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/permissions";
import { getStudentProfileStats } from "@/services/profile";
import { getTranslator } from "@/i18n/server";

export default async function StudentProfilePage() {
  const user = await requireStudent();
  const t = await getTranslator();

  const stats = await getStudentProfileStats(user.id);
  if (!stats) {
    redirect("/");
  }

  const joinDate = user.createdAt
    ? new Intl.DateTimeFormat(t.locale === "bn" ? "bn-BD" : "en-US", { dateStyle: "long" }).format(new Date(user.createdAt))
    : "Active Learner";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      {/* Profile Header Bento Card */}
      <div className="bento-card-static p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary text-xl font-bold font-display shadow-sm">
            {user.name ? user.name.slice(0, 2).toUpperCase() : "ST"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
                {user.name ?? "InsideJibon Learner"}
              </h1>
              <span className="rounded-full bg-primary-container px-2.5 py-0.5 text-[10px] font-bold text-on-primary-container uppercase tracking-wider">
                STUDENT
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
          Academic Progress & Statistics
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="bento-card-static p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("student.profile.stats.enrolled")}
            </span>
            <p className="mt-2 font-display text-3xl font-bold text-primary">{stats.totalCoursesEnrolled}</p>
          </div>

          <div className="bento-card-static p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("student.profile.stats.lessons")}
            </span>
            <p className="mt-2 font-display text-3xl font-bold text-emerald-700">{stats.completedLessons}</p>
          </div>

          <div className="bento-card-static p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("student.profile.stats.assignments")}
            </span>
            <p className="mt-2 font-display text-3xl font-bold text-primary">{stats.assignmentsSubmitted}</p>
          </div>

          <div className="bento-card-static p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("student.profile.stats.exams")}
            </span>
            <p className="mt-2 font-display text-3xl font-bold text-amber-700">{stats.examsTaken}</p>
          </div>
        </div>
      </div>

      <div className="bento-card-static p-4 bg-surface-container-low text-xs text-secondary">
        💡 Note: To update your profile photo, name, or password, click on your avatar in the top navigation bar.
      </div>
    </main>
  );
}
