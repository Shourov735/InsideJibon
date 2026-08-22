import { Suspense } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import type { CurrentUser } from "@/lib/auth";
import { getTranslator } from "@/i18n/server";
import { NotificationBell } from "@/components/student/notifications/notification-bell";

interface StudentNavProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "courses" | "profile";
}

export async function StudentNav({ user, activeSection = "dashboard" }: StudentNavProps) {
  const t = await getTranslator();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-outline-variant bg-surface-container-lowest text-on-surface shadow-xs">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/student" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary shadow-xs">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-primary">
                {t("brand.name")}
              </span>
              <span className="ml-2 rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-semibold text-secondary uppercase">
                {t("nav.student.learnerBadge")}
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/student"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "dashboard"
                  ? "bg-surface-container-low text-primary font-semibold"
                  : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              {t("nav.student.dashboard")}
            </Link>
            <Link
              href="/student/courses"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "courses"
                  ? "bg-surface-container-low text-primary font-semibold"
                  : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              {t("nav.student.courses")}
            </Link>
            <Link
              href="/student/profile"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "profile"
                  ? "bg-surface-container-low text-primary font-semibold"
                  : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              Profile
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <Suspense fallback={<span className="h-5 w-5" />}>
            <NotificationBell userId={user.id} />
          </Suspense>

          <Link
            href="/courses"
            className="hidden items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary sm:inline-flex"
          >
            {t("nav.student.browseCourses")}
          </Link>

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