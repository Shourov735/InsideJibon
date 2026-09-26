"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/shared/feedback";
import { CommandTrigger } from "@/components/shared/command";
import { BrandLogo } from "@/components/shared/brand-logo";
import { useTranslations } from "@/i18n/client";
import type { CurrentUser } from "@/lib/auth";

interface ParentNavClientProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "settings";
}

export function ParentNavClient({
  user,
  activeSection = "dashboard",
}: ParentNavClientProps) {
  const { t } = useTranslations();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-outline-variant bg-surface/95 backdrop-blur-md text-on-surface">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <BrandLogo
            href="/parent"
            badge="PARENT"
            badgeClassName="bg-rose-100 text-rose-700"
          />

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/parent"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "dashboard"
                  ? "border-b-2 border-rose-600 text-rose-700 font-bold rounded-b-none dark:text-rose-300"
                  : "text-secondary hover:text-rose-600"
              }`}
            >
              {t("nav.dashboard")}
            </Link>
            <Link
              href="/parent/settings"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "settings"
                  ? "border-b-2 border-rose-600 text-rose-700 font-bold rounded-b-none dark:text-rose-300"
                  : "text-secondary hover:text-rose-600"
              }`}
            >
              {t("nav.parent.settings")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:block">
            <CommandTrigger />
          </div>
          <ThemeToggle showLabels={false} className="hidden md:inline-flex" />
          <LanguageSwitcher />

          <div className="h-6 w-px bg-outline-variant hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium text-secondary sm:inline-block max-w-[150px] truncate">
              {user.name ?? user.email}
            </span>
            <UserButton />
          </div>

          <button
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-secondary hover:bg-surface-container-low hover:text-rose-600 transition-colors cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-outline-variant bg-surface-container-lowest/98 backdrop-blur-xl px-4 py-4 space-y-1.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <Link
            href="/parent"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              activeSection === "dashboard"
                ? "bg-rose-600 text-white font-bold shadow-xs"
                : "text-on-surface hover:bg-surface-container-low"
            }`}
          >
            <span className="text-base">📊</span>
            <span>{t("nav.dashboard")}</span>
          </Link>
          <Link
            href="/parent/settings"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              activeSection === "settings"
                ? "bg-rose-600 text-white font-bold shadow-xs"
                : "text-on-surface hover:bg-surface-container-low"
            }`}
          >
            <span className="text-base">⚙️</span>
            <span>{t("nav.parent.settings")}</span>
          </Link>
          <div className="pt-2 border-t border-outline-variant">
            <ThemeToggle showLabels className="w-full justify-between" />
          </div>
        </div>
      )}
    </header>
  );
}
