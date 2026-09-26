"use client";

import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { AppHeader, type AppHeaderNavItem } from "@/components/shared/ui/app-header";
import {
  BookIcon,
  CalendarIcon,
  ChartIcon,
  ClipboardIcon,
  HomeIcon,
  PlusIcon,
  TrophyIcon,
  UsersIcon,
  VideoIcon,
} from "@/components/shared/ui/icons";

interface TeacherNavClientProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "courses" | "exams" | "assignments" | "new";
  labels: {
    dashboard: string;
    courses: string;
    exams: string;
    assignments: string;
    createCourse: string;
    liveClasses: string;
    analytics: string;
    announcements: string;
    students: string;
    payments: string;
    schedule: string;
    profile: string;
    menu: string;
    more: string;
  };
}

export function TeacherNavClient({ user, labels }: TeacherNavClientProps) {
  const navItems: AppHeaderNavItem[] = [
    {
      label: labels.dashboard,
      href: "/teacher",
      icon: <HomeIcon size={16} />,
      bottomNav: true,
    },
    {
      label: labels.courses,
      href: "/teacher/courses",
      icon: <BookIcon size={16} />,
      bottomNav: true,
      matchPrefix: "/teacher/courses",
    },
    {
      label: labels.exams,
      href: "/teacher/exams",
      icon: <ClipboardIcon size={16} />,
      bottomNav: true,
      matchPrefix: "/teacher/exams",
    },
    {
      label: labels.assignments,
      href: "/teacher/assignments",
      icon: <ClipboardIcon size={16} />,
      bottomNav: true,
      matchPrefix: "/teacher/assignments",
    },
    {
      label: labels.liveClasses,
      href: "/teacher/courses",
      icon: <VideoIcon size={16} />,
      bottomNav: false,
    },
    {
      label: labels.analytics,
      href: "/teacher/courses",
      icon: <ChartIcon size={16} />,
      bottomNav: false,
    },
    {
      label: labels.students,
      href: "/teacher/courses",
      icon: <UsersIcon size={16} />,
      bottomNav: false,
    },
    {
      label: labels.announcements,
      href: "/teacher/courses",
      icon: <TrophyIcon size={16} />,
      bottomNav: false,
    },
    {
      label: labels.schedule,
      href: "/teacher/schedule",
      icon: <CalendarIcon size={16} />,
      bottomNav: false,
    },
    {
      label: labels.payments,
      href: "/teacher/payments",
      icon: <CalendarIcon size={16} />,
      bottomNav: false,
    },
    {
      label: labels.profile,
      href: "/teacher/profile",
      icon: <PlusIcon size={16} />,
      bottomNav: false,
    },
  ];

  return (
    <AppHeader
      variant="teacher"
      roleBadge="EDUCATOR"
      navItems={navItems}
      user={{ name: user.name, email: user.email }}
      trailing={
        <Link
          href="/teacher/courses/new"
          className="hidden h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-on-primary hover:bg-primary/90 md:inline-flex"
        >
          <PlusIcon size={14} />
          {labels.createCourse}
        </Link>
      }
    />
  );
}
