import type { CurrentUser } from "@/lib/auth";
import { getTranslator } from "@/i18n/server";
import { TeacherNavClient } from "./teacher-nav-client";

interface TeacherNavProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "courses" | "exams" | "assignments" | "new";
}

export async function TeacherNav({ user, activeSection = "dashboard" }: TeacherNavProps) {
  const t = await getTranslator();
  return (
    <TeacherNavClient
      user={user}
      activeSection={activeSection}
      labels={{
        dashboard: t("nav.teacher.dashboard"),
        courses: t("nav.teacher.courses"),
        exams: t("nav.teacher.exams"),
        assignments: t("nav.teacher.assignments"),
        createCourse: t("nav.teacher.createCourse"),
        liveClasses: t("nav.teacher.classes"),
        analytics: t("nav.teacher.analytics"),
        announcements: t("nav.teacher.announcements"),
        students: t("nav.teacher.students"),
        payments: t("nav.teacher.payments"),
        schedule: t("nav.teacher.schedule"),
        profile: t("nav.teacher.profile"),
        menu: t("nav.menu"),
        more: t("nav.more"),
      }}
    />
  );
}
