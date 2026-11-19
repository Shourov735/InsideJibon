"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/i18n/client";
import { useAuth } from "@clerk/nextjs";

import { AppHeader, type AppHeaderNavItem } from "@/components/shared/ui/app-header";
import {
  BookIcon,
  CompassIcon,
  HomeIcon,
  VideoIcon,
} from "@/components/shared/ui/icons";

type HeaderRole = "student" | "teacher" | "admin" | "parent" | null;

interface MarketingHeaderProps {
  role?: HeaderRole;
}

/**
 * MarketingHeader — public-facing top nav.
 *
 * Delegates to the shared AppHeader primitive. Adds a small live-role
 * refresh on the client so that the dashboard link is correct after
 * a modal sign-in (where the server-rendered `role` is stale).
 */
export function MarketingHeader({ role = null }: MarketingHeaderProps) {
  const { isSignedIn } = useAuth();
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

  const { locale } = useTranslations();
  const isBn = locale === "bn";
  const navItems: AppHeaderNavItem[] = [
    {
      label: isBn ? "কোর্সসমূহ" : "Explore courses",
      href: "/courses",
      icon: <BookIcon size={16} />,
      primaryNav: true,
      matchPrefix: "/courses",
    },
    {
      label: isBn ? "লাইভ ক্লাস" : "Live classes",
      href: "/#experience",
      icon: <VideoIcon size={16} />,
      primaryNav: true,
    },
    {
      label: isBn ? "শিক্ষক পরিচিতি" : "For teachers",
      href: "/#instructor",
      icon: <CompassIcon size={16} />,
      primaryNav: true,
    },
    {
      label: isBn ? "পদ্ধতিগত কাঠামো" : "About",
      href: "/#method",
      icon: <HomeIcon size={16} />,
      primaryNav: true,
    },
  ];

  const dashboardHref = liveRole
    ? liveRole === "teacher"
      ? "/teacher"
      : liveRole === "admin"
        ? "/admin"
        : liveRole === "parent"
          ? "/parent"
          : "/student"
    : "/student";

  return (
    <AppHeader
      variant="marketing"
      navItems={navItems}
      signedOut={!isSignedIn}
      bottomNav={false}
      dashboardHref={dashboardHref}
    />
  );
}
