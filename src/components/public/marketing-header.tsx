"use client";
import Link from "next/link";
import { useTranslations } from "@/i18n/client";
import { SignInButton, Show, UserButton, useAuth } from "@clerk/nextjs";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/shared/brand-logo";

type HeaderRole = "student" | "teacher" | "admin" | null;

const DASHBOARD_PATH: Record<Exclude<HeaderRole, null>, string> = {
  student: "/student",
  teacher: "/teacher",
  admin: "/admin",
};

export function MarketingHeader({ role = null }: { role?: HeaderRole }) {
  const { t } = useTranslations();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isSignedIn } = useAuth();
  // The server-provided role can be stale after a modal sign-in (the RSC
  // payload was rendered while signed out). Re-fetch it whenever Clerk
  // reports an active session so the dashboard link is always correct.
  const [liveRole, setLiveRole] = useState<HeaderRole>(role);
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.role) setLiveRole(data.role as HeaderRole);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);
  const dashboardHref = liveRole ? DASHBOARD_PATH[liveRole] : "/student";

  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant bg-surface/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <BrandLogo href="/" />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-secondary hover:text-primary transition-colors">{t("nav.home")}</Link>
          <Link href="/courses" className="text-sm font-medium text-secondary hover:text-primary transition-colors">{t("nav.courses")}</Link>
          <a href="/#instructor" className="text-sm font-medium text-secondary hover:text-primary transition-colors">{t("nav.instructor")}</a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="hidden md:inline-flex text-sm font-semibold text-primary hover:underline px-2 cursor-pointer">
                {t("nav.signIn")}
              </button>
            </SignInButton>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs sm:text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
            >
              {t("nav.getStarted")}
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href={dashboardHref}
              className="hidden md:inline-flex text-sm font-semibold text-primary hover:underline"
            >
              {t("nav.dashboard")}
            </Link>
            <UserButton />
          </Show>
          {/* Mobile toggle */}
          <button
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-secondary hover:bg-surface-container-low hover:text-primary transition-colors cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileOpen && (
        <div className="md:hidden border-t border-outline-variant bg-surface-container-lowest/98 backdrop-blur-xl px-4 py-5 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-1">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <span className="text-base">🏠</span>
              <span>{t("nav.home")}</span>
            </Link>
            <Link
              href="/courses"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <span className="text-base">📚</span>
              <span>{t("nav.courses")}</span>
            </Link>
            <a
              href="/#instructor"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <span className="text-base">👨‍🏫</span>
              <span>{t("nav.instructor")}</span>
            </a>
          </nav>

          <div className="border-t border-outline-variant pt-3 space-y-2">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm font-semibold text-primary hover:bg-surface-container transition-colors text-center cursor-pointer"
                >
                  {t("nav.signIn")}
                </button>
              </SignInButton>
              <Link
                href="/sign-up"
                onClick={() => setMobileOpen(false)}
                className="block w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary text-center shadow-sm hover:bg-primary-container transition-colors"
              >
                {t("nav.getStarted")}
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href={dashboardHref}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary text-center shadow-sm hover:bg-primary-container transition-colors"
              >
                <span>{t("nav.dashboard")}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </Show>
          </div>
        </div>
      )}
    </header>
  );
}
