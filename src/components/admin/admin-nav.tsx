import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import type { CurrentUser } from "@/lib/auth";
import { getTranslator } from "@/i18n/server";

import { BrandLogo } from "@/components/shared/brand-logo";

interface AdminNavProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "users";
}

export async function AdminNav({ user, activeSection = "dashboard" }: AdminNavProps) {
  const t = await getTranslator();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-outline-variant bg-surface-container-lowest text-on-surface shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <BrandLogo href="/admin" badge="ADMIN" />

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/admin"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "dashboard"
                  ? "bg-surface-container-low text-primary font-semibold"
                  : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              {t("admin.nav.dashboard")}
            </Link>
            <Link
              href="/admin/users"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "users"
                  ? "bg-surface-container-low text-primary font-semibold"
                  : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              {t("admin.nav.users")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <div className="h-6 w-px bg-outline-variant" />

          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium text-secondary sm:inline-block">
              {user.name ?? user.email}
            </span>
            <UserButton />
          </div>
        </div>
      </div>
    </header>
  );
}
