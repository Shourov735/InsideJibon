import { Suspense } from "react";
import type { CurrentUser } from "@/lib/auth";
import { NotificationBell } from "@/components/student/notifications/notification-bell";
import { StudentNavClient } from "./student-nav-client";

interface StudentNavProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "courses" | "profile";
}

export async function StudentNav({ user, activeSection = "dashboard" }: StudentNavProps) {
  return (
    <StudentNavClient
      user={user}
      activeSection={activeSection}
      bell={
        <Suspense fallback={<span className="h-5 w-5" />}>
          <NotificationBell userId={user.id} />
        </Suspense>
      }
    />
  );
}