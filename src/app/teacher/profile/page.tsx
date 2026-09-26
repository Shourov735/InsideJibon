import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/permissions";
import { getTeacherProfileStats } from "@/services/profile";
import { getTranslator } from "@/i18n/server";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { Stat } from "@/components/shared/ui/stat";
import { Badge } from "@/components/shared/ui/badge";
import { Alert } from "@/components/shared/ui/alert";
import {
  BookIcon,
  CalendarIcon,
  TrophyIcon,
  UsersIcon,
  UserIcon,
} from "@/components/shared/ui/icons";
import { formatNumber } from "@/lib/utils";

export default async function TeacherProfilePage() {
  const user = await requireTeacher();
  const t = await getTranslator();

  const stats = await getTeacherProfileStats(user.id);
  if (!stats) {
    redirect("/");
  }

  const joinDate = user.createdAt
    ? new Intl.DateTimeFormat(t.locale === "bn" ? "bn-BD" : "en-US", {
        dateStyle: "long",
      }).format(new Date(user.createdAt))
    : "Lead Educator";

  const initials = user.name
    ? user.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
    : "TH";

  return (
    <Container className="py-6 sm:py-8" size="xl">
      <div className="flex items-start gap-4 rounded-3xl border border-outline-variant bg-gradient-to-br from-primary-container/40 via-surface-0 to-surface-1 p-5 sm:items-center sm:gap-5 sm:p-6">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary font-display text-xl font-bold text-on-primary shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)] sm:h-20 sm:w-20">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
              {user.name ?? "Tanvir Hasan Jibon"}
            </h1>
            <Badge tone="warning" size="xs">
              EDUCATOR
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-ink-500">{user.email}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-500">
            <CalendarIcon size={12} />
            Joined {joinDate}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-1.5 text-primary">
              <TrophyIcon size={14} />
              Teaching Overview
            </span>
          }
          title="Performance Overview"
          description="Your lifetime stats across all created courses."
        />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <Stat
            label={t("teacher.profile.stats.courses")}
            value={formatNumber(stats.totalCoursesCreated, { locale: t.locale })}
            icon={<BookIcon size={18} />}
            tone="primary"
            hint="Created courses"
          />
          <Stat
            label={t("teacher.profile.stats.students")}
            value={formatNumber(stats.totalStudents, { locale: t.locale })}
            icon={<UsersIcon size={18} />}
            tone="success"
            hint="Total enrolled learners"
          />
          <Stat
            label="Platform Role"
            value="Lead"
            icon={<TrophyIcon size={18} />}
            tone="warning"
            hint="Curriculum author & instructor"
          />
        </div>
      </div>

      <div className="mt-6">
        <Alert tone="info" icon={<UserIcon size={14} />}>
          To update your profile photo, name, or credentials, click on your avatar in the top navigation bar.
        </Alert>
      </div>
    </Container>
  );
}
