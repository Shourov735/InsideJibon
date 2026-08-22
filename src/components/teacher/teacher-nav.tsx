import type { CurrentUser } from "@/lib/auth";
import { TeacherNavClient } from "./teacher-nav-client";

interface TeacherNavProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "courses" | "exams" | "assignments" | "new";
}

export function TeacherNav({ user, activeSection = "dashboard" }: TeacherNavProps) {
  return (
    <TeacherNavClient
      user={user}
      activeSection={activeSection}
    />
  );
}