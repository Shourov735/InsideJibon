import type { CurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/services/notifications";
import { getTranslator } from "@/i18n/server";
import { StudentNavClient } from "./student-nav-client";

interface StudentNavProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "courses" | "profile" | "browse";
}

export async function StudentNav({ user, activeSection = "dashboard" }: StudentNavProps) {
  const initialCount = await getUnreadNotificationCount(user.id);
  const t = await getTranslator();

  return (
    <StudentNavClient
      user={user}
      activeSection={activeSection}
      initialCount={initialCount}
      labels={{
        dashboard: t("nav.student.dashboard"),
        myCourses: t("nav.student.courses"),
        browse: t("nav.student.browseCourses"),
        assignments: t("nav.student.assignments"),
        exams: t("nav.student.exams"),
        notifications: t("nav.student.notifications"),
        profile: t("nav.student.profile"),
        schedule: t("nav.student.schedule"),
        payments: t("nav.student.payments"),
        achievements: t("nav.student.badges"),
        aiTutor: t("nav.student.aiTutor"),
        menu: t("nav.menu"),
        more: t("nav.more"),
        notificationsAlt: t("nav.notifications"),
      }}
    />
  );
}
