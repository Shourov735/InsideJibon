/**
 * AppHeader — universal authenticated top nav.
 *
 * Single source of truth for student / teacher / admin / parent
 * top navigation. Each role passes its own navItems + accent.
 *
 * Desktop (>md): brand on the left, primary links in the middle,
 *   command / notifications / user on the right.
 * Mobile (<md): brand on the left, condensed actions on the
 *   right. A bottom-nav renders the top 4 primary actions and a
 *   "More" sheet handles the rest.
 *
 * The bottom-nav is opt-in via `bottomNav` so it can be disabled
 * on landing/auth pages.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";

import { BrandLogo } from "@/components/shared/brand-logo";
import { useTranslations } from "@/i18n/client";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/shared/feedback/theme-toggle";
import { CommandTrigger } from "@/components/shared/command/command-trigger";

import {
  IconButton,
  MobileDrawer,
} from "@/components/shared/ui";
import {
  ArrowRightIcon,
  BellIcon,
  ChevronDownIcon,
  HomeIcon,
  LogInIcon,
  MenuIcon,
  XIcon,
} from "@/components/shared/ui/icons";
import { cn } from "@/lib/utils";

export interface AppHeaderNavItem {
  /** Translation key OR raw label. */
  label: string;
  /** Path the link points to. */
  href: string;
  /** Optional badge: numeric count or simple text. */
  badge?: number | string;
  /** Optional icon (a ReactNode, usually an Icon component). */
  icon?: ReactNode;
  /** Mark this item as a primary bottom-nav entry. Max 4. */
  bottomNav?: boolean;
  /** Active route matcher — if undefined, uses exact href match. */
  matchPrefix?: string;
}

export interface AppHeaderProps {
  /** "marketing" hides the user chip + uses /sign-in entry. */
  variant: "marketing" | "student" | "teacher" | "admin" | "parent";
  /** Role accent label rendered next to logo (e.g. "STUDENT"). */
  roleBadge?: string;
  navItems: AppHeaderNavItem[];
  /** User info shown in the header chip (signed-in variants only). */
  user?: { name?: string | null; email: string };
  /** Notification bell node (authenticated variants). Omit for marketing. */
  showNotificationBell?: boolean;
  /** Optional right-side content (e.g. a CTA button). */
  trailing?: ReactNode;
  /** Marketing-only: when signed out, show sign-in/up buttons. */
  signedOut?: boolean;
  /** Whether to render the bottom-nav (default true for auth variants). */
  bottomNav?: boolean;
}

export function AppHeader({
  variant,
  roleBadge,
  navItems,
  user,
  showNotificationBell = false,
  trailing,
  signedOut = false,
  bottomNav: bottomNavEnabled = true,
}: AppHeaderProps) {
  const { t } = useTranslations();
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Primary navigation items (selected for the bottom nav). Pick items
  // marked `bottomNav`, else fall back to the first 4.
  const bottomItems = useMemo(() => {
    const marked = navItems.filter((i) => i.bottomNav);
    const pool = marked.length > 0 ? marked : navItems;
    return pool.slice(0, 4);
  }, [navItems]);

  const moreItems = useMemo(
    () => navItems.filter((item) => !bottomItems.some((b) => b.href === item.href)),
    [navItems, bottomItems],
  );

  const isActive = (item: AppHeaderNavItem) => {
    const target = item.matchPrefix ?? item.href;
    if (target === "/") return pathname === "/";
    return pathname === target || pathname.startsWith(`${target}/`);
  };

  // Close drawers on route change
  useEffect(() => {
    setMobileNavOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  const dashboardHref = useMemo(() => {
    if (variant === "student") return "/student";
    if (variant === "teacher") return "/teacher";
    if (variant === "admin") return "/admin";
    if (variant === "parent") return "/parent";
    return "/student";
  }, [variant]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full border-b border-outline-variant bg-surface/90 backdrop-blur-md",
        )}
      >
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6">
          {/* Brand */}
          <div className="flex min-w-0 items-center gap-3">
            {variant === "marketing" ? (
              <BrandLogo href="/" />
            ) : (
              <BrandLogo href={dashboardHref} badge={roleBadge} />
            )}
            <span className="hidden truncate text-sm font-medium text-ink-500 sm:inline-block">
              {variant === "marketing" ? "InsideJibon" : null}
            </span>
          </div>

          {/* Desktop nav links */}
          <nav
            aria-label="Primary"
            className="hidden flex-1 items-center gap-1 md:flex"
          >
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                    active
                      ? "bg-primary-container text-on-primary-container"
                      : "text-ink-700 hover:bg-surface-1 hover:text-ink-900",
                  )}
                >
                  {item.icon ? <span aria-hidden>{item.icon}</span> : null}
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-2 px-1.5 text-[10px] font-semibold text-ink-700">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* Desktop right side */}
          <div className="flex items-center gap-2">
            {/* Global search trigger (auth only) */}
            {variant !== "marketing" ? (
              <div className="hidden md:block">
                <CommandTrigger />
              </div>
            ) : null}

            {/* Theme + language (desktop) */}
            {variant !== "marketing" ? (
              <div className="hidden md:block">
                <ThemeToggle showLabels={false} />
              </div>
            ) : null}
            <LanguageSwitcher />

            {/* Notification bell (inline — the server bell is rendered by the role layout) */}
            {showNotificationBell && isSignedIn && user ? (
              <Link
                href={`/${variant}/notifications`}
                aria-label={t("nav.notifications") ?? "Notifications"}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink-700 hover:bg-surface-1"
              >
                <BellIcon size={18} />
              </Link>
            ) : null}

            {/* Right-side CTA / chip */}
            {variant === "marketing" ? (
              signedOut ? (
                <div className="hidden items-center gap-2 md:flex">
                  <Link
                    href="/sign-in"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-900 hover:bg-surface-1"
                  >
                    <LogInIcon size={16} />
                    {t("nav.signIn")}
                  </Link>
                  <Link
                    href="/sign-up"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-on-primary hover:bg-primary/90"
                  >
                    {t("nav.getStarted")}
                    <ArrowRightIcon size={14} />
                  </Link>
                </div>
              ) : (
                <Link
                  href={dashboardHref}
                  className="hidden md:inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-on-primary hover:bg-primary/90"
                >
                  {t("nav.dashboard")}
                  <ArrowRightIcon size={14} />
                </Link>
              )
            ) : null}

            {trailing}

            {/* User chip */}
            {variant !== "marketing" && user ? (
              <div className="hidden items-center gap-2 sm:flex">
                <div className="hidden text-right md:block">
                  <div className="text-xs font-semibold text-ink-900 truncate max-w-[160px]">
                    {user.name ?? user.email}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-ink-500">{roleBadge}</div>
                </div>
                <UserButton />
              </div>
            ) : null}

            {/* Mobile trigger — opens the bottom sheet */}
            <IconButton
              size="sm"
              variant="outline"
              aria-label="Open menu"
              className="md:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <MenuIcon size={18} />
            </IconButton>
          </div>
        </div>

        {/* Bottom nav (mobile only) */}
        {bottomNavEnabled && variant !== "marketing" ? (
          <nav
            aria-label="Bottom"
            className="fixed bottom-0 left-0 right-0 z-30 border-t border-outline-variant bg-surface-0/95 backdrop-blur md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1">
              {bottomItems.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.href} className="flex-1">
                    <Link
                      href={item.href}
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors",
                        active ? "text-role" : "text-ink-500 hover:text-ink-900",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                          active ? "bg-role-container text-role" : "text-ink-500",
                        )}
                      >
                        {item.icon ?? <HomeIcon size={18} />}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
              {moreItems.length > 0 ? (
                <li className="flex-1">
                  <button
                    type="button"
                    onClick={() => setMoreOpen(true)}
                    className={cn(
                      "flex w-full flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors",
                      moreOpen ? "text-role" : "text-ink-500 hover:text-ink-900",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg",
                        moreOpen ? "bg-role-container text-role" : "text-ink-500",
                      )}
                    >
                      <ChevronDownIcon size={18} />
                    </span>
                    <span>{t("nav.more") ?? "More"}</span>
                  </button>
                </li>
              ) : null}
            </ul>
          </nav>
        ) : null}
      </header>

      {/* Mobile nav drawer (all primary links) */}
      <MobileDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title={
          variant === "marketing"
            ? "InsideJibon"
            : roleBadge
              ? t("nav.menu") ?? "Menu"
              : undefined
        }
      >
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-container text-on-primary-container"
                      : "text-ink-900 hover:bg-surface-1",
                  )}
                >
                  {item.icon ? (
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl",
                        active ? "bg-surface-0" : "bg-surface-1 text-ink-700",
                      )}
                    >
                      {item.icon}
                    </span>
                  ) : null}
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-2 px-1.5 text-[10px] font-semibold text-ink-700">
                      {item.badge}
                    </span>
                  ) : null}
                  <ArrowRightIcon size={14} className="text-ink-300" />
                </Link>
              </li>
            );
          })}
          {variant === "marketing" && signedOut ? (
            <>
              <li className="!mt-4 grid grid-cols-2 gap-2">
                <Link
                  href="/sign-in"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-outline-variant bg-surface-0 text-sm font-semibold text-ink-900"
                >
                  {t("nav.signIn")}
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-on-primary"
                >
                  {t("nav.getStarted")}
                </Link>
              </li>
            </>
          ) : null}
        </ul>

        {variant !== "marketing" ? (
          <div className="mt-4 space-y-3 border-t border-outline-variant pt-4">
            <div className="flex items-center justify-between rounded-2xl bg-surface-1 px-3 py-2">
              <span className="text-sm font-medium text-ink-700">{t("theme.system")}</span>
              <ThemeToggle showLabels={false} />
            </div>
            {user ? (
              <div className="flex items-center gap-3 rounded-2xl bg-surface-1 px-3 py-2">
                <UserButton />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink-900">{user.name ?? user.email}</div>
                  <div className="truncate text-xs text-ink-500">{user.email}</div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </MobileDrawer>

      {/* "More" sheet (auth only) */}
      <MobileDrawer
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={t("nav.more") ?? "More"}
      >
        <ul className="space-y-1">
          {moreItems.map((item) => {
            const active = isActive(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-container text-on-primary-container"
                      : "text-ink-900 hover:bg-surface-1",
                  )}
                >
                  {item.icon ? (
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl",
                        active ? "bg-surface-0" : "bg-surface-1 text-ink-700",
                      )}
                    >
                      {item.icon}
                    </span>
                  ) : null}
                  <span className="flex-1">{item.label}</span>
                  <ArrowRightIcon size={14} className="text-ink-300" />
                </Link>
              </li>
            );
          })}
        </ul>
      </MobileDrawer>
    </>
  );
}
