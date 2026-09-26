import type { CurrentUser } from "@/lib/auth";
import { getTranslator } from "@/i18n/server";
import { ParentNavClient } from "./parent-nav-client";

interface ParentNavProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "settings" | "invite";
}

export async function ParentNav({
  user,
  activeSection = "dashboard",
}: ParentNavProps) {
  const t = await getTranslator();
  return (
    <ParentNavClient
      user={user}
      activeSection={activeSection}
      labels={{
        dashboard: t("nav.dashboard"),
        children: t("nav.parent.children"),
        settings: t("nav.parent.settings"),
        invite: t("parent.invite.title"),
        menu: t("nav.menu"),
        more: t("nav.more"),
      }}
    />
  );
}
