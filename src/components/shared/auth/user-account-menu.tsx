"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTranslations } from "@/i18n/client";
import {
  BookIcon,
  ChartIcon,
  ChevronDownIcon,
  ClipboardIcon,
  HelpCircleIcon,
  LayoutGridIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/shared/ui/icons";

export interface UserAccountMenuProps {
  /** Optional fallback server user if client hook is hydrating */
  user?: {
    name?: string | null;
    email?: string | null;
    imageUrl?: string | null;
  } | null;
  /** Role of current context or user */
  role?: "student" | "teacher" | "admin" | "parent" | "marketing" | null;
  /** Role badge string */
  roleBadge?: string;
  className?: string;
}

export function UserAccountMenu({
  user: initialUser,
  role = "student",
  roleBadge,
  className = "",
}: UserAccountMenuProps) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { t, locale } = useTranslations();
  const isBn = locale === "bn";

  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Merge client Clerk user with server fallback
  const displayName =
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    initialUser?.name ||
    clerkUser?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    initialUser?.email?.split("@")[0] ||
    "User";

  const displayEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    initialUser?.email ||
    "";

  const displayImage =
    clerkUser?.imageUrl ||
    initialUser?.imageUrl ||
    null;

  const resolvedRole =
    ((clerkUser?.publicMetadata?.role as string) ||
    role ||
    "student").toLowerCase();

  // Role Badge text & color scheme
  let roleLabel = roleBadge || (isBn ? "শিক্ষার্থী" : "Student");
  let roleBadgeClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900";
  let roleIcon = "🎓";

  if (resolvedRole === "teacher") {
    roleLabel = isBn ? "শিক্ষক" : "Teacher";
    roleBadgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900";
    roleIcon = "👨‍🏫";
  } else if (resolvedRole === "admin") {
    roleLabel = isBn ? "এডমিন" : "Admin";
    roleBadgeClass = "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
    roleIcon = "🛡️";
  } else if (resolvedRole === "parent") {
    roleLabel = isBn ? "অভিভাবক" : "Parent";
    roleBadgeClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900";
    roleIcon = "👨‍👩‍👦";
  }

  // Role-aware primary navigation links
  const primaryLinks = (() => {
    if (resolvedRole === "teacher") {
      return [
        { label: t("nav.user.myDashboard") || "Dashboard", href: "/teacher", icon: <LayoutGridIcon size={16} /> },
        { label: t("nav.user.myCourses") || "My Courses", href: "/teacher/courses", icon: <BookIcon size={16} /> },
        { label: t("nav.user.myAssignments") || "Assignments", href: "/teacher/assignments", icon: <ClipboardIcon size={16} /> },
        { label: t("nav.teacher.schedule") || "Schedule", href: "/teacher/schedule", icon: <ChartIcon size={16} /> },
      ];
    }
    if (resolvedRole === "admin") {
      return [
        { label: t("nav.user.myDashboard") || "Dashboard", href: "/admin", icon: <LayoutGridIcon size={16} /> },
        { label: t("nav.admin.payments") || "Payments", href: "/admin/payments", icon: <ChartIcon size={16} /> },
      ];
    }
    if (resolvedRole === "parent") {
      return [
        { label: t("nav.user.myDashboard") || "Dashboard", href: "/parent", icon: <LayoutGridIcon size={16} /> },
        { label: t("nav.parent.children") || "Children", href: "/parent", icon: <BookIcon size={16} /> },
      ];
    }
    // Default student
    return [
      { label: t("nav.user.myDashboard") || "My Dashboard", href: "/student", icon: <LayoutGridIcon size={16} /> },
      { label: t("nav.user.myCourses") || "My Courses", href: "/student/courses", icon: <BookIcon size={16} /> },
      { label: t("nav.user.myAssignments") || "My Assignments", href: "/student/courses", icon: <ClipboardIcon size={16} /> },
      { label: t("nav.user.myProgress") || "My Progress", href: "/student/profile", icon: <ChartIcon size={16} /> },
    ];
  })();

  const settingsHref =
    resolvedRole === "teacher"
      ? "/teacher/profile"
      : resolvedRole === "parent"
        ? "/parent/settings"
        : "/student/profile";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const router = useRouter();

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut({ redirectUrl: "/" });
    } catch {
      router.push("/");
    }
  }

  // If client-loaded and definitely not signed in, don't show user menu
  if (isLoaded && !isSignedIn && !initialUser) {
    return null;
  }

  return (
    <div ref={menuRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button: Profile Picture + Chevron */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User Account Menu"
        className="group flex items-center gap-1.5 rounded-full p-1 transition-all hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-600/40 dark:hover:bg-slate-800"
      >
        <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-blue-100 font-bold text-blue-900 shadow-2xs dark:border-slate-700 dark:bg-blue-950 dark:text-blue-200">
          {displayImage ? (
            <Image
              src={displayImage}
              alt={displayName}
              width={40}
              height={40}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-xs sm:text-sm font-semibold">{initials}</span>
          )}
        </div>

        <ChevronDownIcon
          size={14}
          className={`text-slate-500 transition-transform duration-200 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown Card */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2.5 w-72 sm:w-80 origin-top-right rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-[0_20px_50px_rgba(0,35,70,0.14)] backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-150 dark:border-slate-800 dark:bg-slate-900"
        >
          {/* User Profile Header Card */}
          <div className="flex items-center gap-3 pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-blue-50 text-blue-900 shadow-xs dark:border-slate-700 dark:bg-blue-950 dark:text-blue-200">
              {displayImage ? (
                <Image
                  src={displayImage}
                  alt={displayName}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <UserIcon size={22} className="text-blue-600 dark:text-blue-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                {displayName}
              </div>
              {displayEmail && (
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {displayEmail}
                </div>
              )}
              <div className="mt-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${roleBadgeClass}`}
                >
                  <span>{roleIcon}</span>
                  <span>{roleLabel}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Primary Role Workspace Links */}
          <div className="space-y-1 py-1">
            {primaryLinks.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <span className="text-slate-500 dark:text-slate-400">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Secondary Divider */}
          <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

          {/* Utilities: Account Settings & Support */}
          <div className="space-y-1 py-1">
            <Link
              href={settingsHref}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <SettingsIcon size={16} className="text-slate-500 dark:text-slate-400" />
              <span>{t("nav.user.accountSettings") || "Account Settings"}</span>
            </Link>

            <Link
              href="/legal/terms"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <HelpCircleIcon size={16} className="text-slate-500 dark:text-slate-400" />
              <span>{t("nav.user.helpSupport") || "Help & Support"}</span>
            </Link>
          </div>

          {/* Branded Sign Out Button */}
          <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isSigningOut}
              onClick={handleSignOut}
              className="flex w-full items-center justify-between rounded-xl bg-red-50 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-red-600 transition-colors hover:bg-red-100 active:scale-[0.99] disabled:opacity-60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70"
            >
              <div className="flex items-center gap-2.5">
                <LogOutIcon size={16} />
                <span>{isSigningOut ? (isBn ? "সাইন আউট হচ্ছে..." : "Signing out...") : (t("nav.user.signOut") || "Sign Out")}</span>
              </div>
              <span className="font-mono text-xs opacity-60">→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
