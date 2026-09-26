import type { CurrentUser } from "@/lib/auth";
import { getTranslator } from "@/i18n/server";
import { AdminNavClient } from "./admin-nav-client";

interface AdminNavProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "users" | "payments" | "bundles" | "settings" | "queue";
}

export async function AdminNav({ user, activeSection = "dashboard" }: AdminNavProps) {
  const t = await getTranslator();
  return (
    <AdminNavClient
      user={user}
      activeSection={activeSection}
      labels={{
        dashboard: t("admin.nav.dashboard"),
        users: t("admin.nav.users"),
        payments: t("payment.admin.title"),
        settings: t("payment.admin.numbers.title"),
        queue: t("nav.admin.queue"),
        menu: t("nav.menu"),
        more: t("nav.more"),
      }}
    />
  );
}
