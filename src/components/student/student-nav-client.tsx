"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
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
  SearchIcon,
  SparklesIcon,
  UserIcon,
  VideoIcon,
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
  const { isSignedIn } = useAuth();
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
    },
    {
      label: labels.myCourses,
      href: "/student/courses",
      icon: <BookIcon size={16} />,
      bottomNav: true,
      matchPrefix: "/student/courses",
    },
    {
      label: labels.exams,
      href: "/student/schedule",
      icon: <CalendarIcon size={16} />,
      bottomNav: true,
    },
    {
      label: labels.notifications,
      href: "/student/notifications",
      icon: (
        <span className="relative inline-flex">
          <SearchIcon size={16} />
          {isSignedIn && count > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[color:var(--color-danger)] px-1 text-[8px] font-bold text-white">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </span>
      ),
      bottomNav: true,
    },
    {
      label: labels.browse,
      href: "/courses",
      icon: <CompassIcon size={16} />,
      bottomNav: false,
    },
    {
      label: labels.assignments,
      href: "/student/schedule",
      icon: <ClipboardIcon size={16} />,
      bottomNav: false,
    },
    {
      label: labels.schedule,
      href: "/student/schedule",
      icon: <CalendarIcon size={16} />,
      bottomNav: false,
    },
    {
      label: labels.aiTutor,
      href: "/student/schedule",
      icon: <SparklesIcon size={16} />,
      bottomNav: false,
    },
    {
      label: labels.achievements,
      href: "/student/badges",
      icon: <AwardIcon size={16} />,
      bottomNav: false,
    },
    {
      label: labels.payments,
      href: "/student/payments",
      icon: <CreditCardIcon size={16} />,
      bottomNav: false,
    },
    {
      label: labels.profile,
      href: "/student/profile",
      icon: <UserIcon size={16} />,
      bottomNav: false,
    },
  ];

  return (
    <AppHeader
      variant="student"
      roleBadge="STUDENT"
      navItems={navItems}
      user={{ name: user.name, email: user.email }}
      showNotificationBell
    />
  );
}

// Re-export for older import paths (not strictly required).
export { UserButton };
