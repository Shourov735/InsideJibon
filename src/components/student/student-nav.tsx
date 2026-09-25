import { Suspense } from "react";
import type { CurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/services/notifications";
import { NotificationBellWithPush } from "@/components/student/notifications/notification-bell-client";
import { StudentNavClient } from "./student-nav-client";

interface StudentNavProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "courses" | "profile";
}

export async function StudentNav({ user, activeSection = "dashboard" }: StudentNavProps) {
  const initialCount = await getUnreadNotificationCount(user.id);
  return (
    <StudentNavClient
      user={user}
      activeSection={activeSection}
      bell={
        <Suspense fallback={<span className="h-5 w-5" />}>
          <NotificationBellWithPush initialCount={initialCount} />
        </Suspense>
      }
    />
  );
}