"use client";
import Link from "next/link";
import { useTranslations } from "@/i18n/client";
import { SignInButton, Show, UserButton } from "@clerk/nextjs";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useState } from "react";

export function MarketingHeader() {
  const { t } = useTranslations();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant bg-surface/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary text-xs font-bold shadow-sm">
            IJ
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-primary">
            InsideJibon
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-secondary hover:text-primary transition-colors">{t("nav.home")}</Link>
          <Link href="/courses" className="text-sm font-medium text-secondary hover:text-primary transition-colors">{t("nav.courses")}</Link>
          <a href="#instructor" className="text-sm font-medium text-secondary hover:text-primary transition-colors">{t("nav.instructor")}</a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="hidden md:inline-flex text-sm font-semibold text-primary hover:underline px-2">
                {t("nav.signIn")}
              </button>
            </SignInButton>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container hover:text-on-primary-container"
            >
              {t("nav.getStarted")}
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/student"
              className="hidden md:inline-flex text-sm font-semibold text-primary hover:underline"
            >
              {t("nav.dashboard")}
            </Link>
            <UserButton />
          </Show>
          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-secondary hover:text-primary"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-outline-variant bg-surface-container-lowest px-4 py-4 space-y-2">
          <Link href="/" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low">{t("nav.home")}</Link>
          <Link href="/courses" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low">{t("nav.courses")}</Link>
          <a href="#instructor" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low">{t("nav.instructor")}</a>
          <Show when="signed-out">
            <Link href="/sign-up" onClick={() => setMobileOpen(false)} className="block rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary text-center">{t("nav.getStarted")}</Link>
          </Show>
          <Show when="signed-in">
            <Link href="/student" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low">{t("nav.dashboard")}</Link>
          </Show>
        </div>
      )}
    </header>
  );
}
