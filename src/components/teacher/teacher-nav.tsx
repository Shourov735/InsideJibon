import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import type { CurrentUser } from "@/lib/auth";
import { getTranslator } from "@/i18n/server";

interface TeacherNavProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "courses" | "exams" | "assignments" | "new";
}

export async function TeacherNav({ user, activeSection = "courses" }: TeacherNavProps) {
  const t = await getTranslator();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-outline-variant bg-surface-container-lowest text-on-surface shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/teacher/courses" className="flex items-center gap-2.5">
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
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-primary">
                {t("brand.name")}
              </span>
              <span className="ml-2 rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-semibold text-secondary uppercase">
                {t("nav.teacher.educatorBadge")}
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/teacher"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "dashboard"
                  ? "bg-surface-container-low text-primary font-semibold"
                  : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              {t("nav.teacher.dashboard")}
            </Link>
            <Link
              href="/teacher/courses"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "courses"
                  ? "bg-surface-container-low text-primary font-semibold"
                  : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              {t("nav.teacher.courses")}
            </Link>
            <Link
              href="/teacher/exams"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "exams"
                  ? "bg-surface-container-low text-primary font-semibold"
                  : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              {t("nav.teacher.exams")}
            </Link>
            <Link
              href="/teacher/assignments"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "assignments"
                  ? "bg-surface-container-low text-primary font-semibold"
                  : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              {t("nav.teacher.assignments")}
            </Link>
            <Link
              href="/teacher/profile"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "profile" as any
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

          <Link
            href="/teacher/courses/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{t("nav.teacher.createCourse")}</span>
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