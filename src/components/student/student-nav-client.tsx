"use client";

import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import { AppHeader, type AppHeaderNavItem } from "@/components/shared/ui/app-header";
import {
  AwardIcon,
  BookIcon,
  CalendarIcon,
  ClipboardIcon,
  CompassIcon,
  CreditCardIcon,
  HomeIcon,
  UserIcon,
} from "@/components/shared/ui/icons";
import type { CurrentUser } from "@/lib/auth";

interface StudentNavClientProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "courses" | "profile" | "browse";
  initialCount: number;
  labels: {
    dashboard: string;
    myCourses: string;
    browse: string;
    assignments: string;
    exams: string;
    notifications: string;
    profile: string;
    schedule: string;
    payments: string;
    achievements: string;
    aiTutor: string;
    menu: string;
    more: string;
    notificationsAlt: string;
  };
  bell?: React.ReactNode;
}

export function StudentNavClient({
  user,
  initialCount,
  labels,
}: StudentNavClientProps) {
  // Live-update unread count after push events.
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ count?: number }>).detail;
      if (typeof detail?.count === "number") setCount(detail.count);
    };
    window.addEventListener("ij:notification-count", handler);
    return () => window.removeEventListener("ij:notification-count", handler);
  }, []);

  const navItems: AppHeaderNavItem[] = [
    {
      label: labels.dashboard,
      href: "/student",
      icon: <HomeIcon size={16} />,
      bottomNav: true,
      primaryNav: true,
    },
    {
      label: labels.myCourses,
      href: "/student/courses",
      icon: <BookIcon size={16} />,
      bottomNav: true,
      primaryNav: true,
      matchPrefix: "/student/courses",
    },
    {
      label: labels.browse,
      href: "/courses",
      icon: <CompassIcon size={16} />,
      bottomNav: true,
      primaryNav: true,
      matchPrefix: "/courses",
    },
    {
      label: labels.schedule,
      href: "/student/schedule",
      icon: <CalendarIcon size={16} />,
      bottomNav: true,
      primaryNav: true,
      matchPrefix: "/student/schedule",
    },
    {
      label: labels.exams,
      href: "/student/schedule",
      icon: <AwardIcon size={16} />,
      bottomNav: false,
      primaryNav: false,
    },
    {
      label: labels.assignments,
      href: "/student/schedule",
      icon: <ClipboardIcon size={16} />,
      bottomNav: false,
      primaryNav: false,
    },
    {
      label: labels.achievements,
      href: "/student/badges",
      icon: <AwardIcon size={16} />,
      bottomNav: false,
      primaryNav: false,
      matchPrefix: "/student/badges",
    },
    {
      label: labels.payments,
      href: "/student/payments",
      icon: <CreditCardIcon size={16} />,
      bottomNav: false,
      primaryNav: false,
      matchPrefix: "/student/payments",
    },
    {
      label: labels.profile,
      href: "/student/profile",
      icon: <UserIcon size={16} />,
      bottomNav: false,
      primaryNav: false,
      matchPrefix: "/student/profile",
    },
  ];

  return (
    <AppHeader
      variant="student"
      roleBadge="STUDENT"
      navItems={navItems}
      user={{ name: user.name, email: user.email }}
      showNotificationBell
      unreadCount={count}
    />
  );
}

// Re-export for older import paths (not strictly required).
export { UserButton };
