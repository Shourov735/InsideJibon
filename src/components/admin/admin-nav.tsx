import type { CurrentUser } from "@/lib/auth";
import { AdminNavClient } from "./admin-nav-client";

interface AdminNavProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "users";
}

export function AdminNav({ user, activeSection = "dashboard" }: AdminNavProps) {
  return <AdminNavClient user={user} activeSection={activeSection} />;
}
