"use client";

import type { CurrentUser } from "@/lib/auth";
import { AppHeader, type AppHeaderNavItem } from "@/components/shared/ui/app-header";
import {
  HomeIcon,
  PlusIcon,
  SettingsIcon,
  UsersIcon,
} from "@/components/shared/ui/icons";

interface ParentNavClientProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "settings" | "invite";
  labels: {
    dashboard: string;
    children: string;
    settings: string;
    invite: string;
    menu: string;
    more: string;
  };
}

export function ParentNavClient({ user, labels }: ParentNavClientProps) {
  const navItems: AppHeaderNavItem[] = [
    {
      label: labels.dashboard,
      href: "/parent",
      icon: <HomeIcon size={16} />,
      bottomNav: true,
    },
    {
      label: labels.children,
      href: "/parent",
      icon: <UsersIcon size={16} />,
      bottomNav: true,
    },
    {
      label: labels.invite,
      href: "/parent/invite",
      icon: <PlusIcon size={16} />,
      bottomNav: true,
    },
    {
      label: labels.settings,
      href: "/parent/settings",
      icon: <SettingsIcon size={16} />,
      bottomNav: false,
    },
  ];

  return (
    <AppHeader
      variant="parent"
      roleBadge="PARENT"
      navItems={navItems}
      user={{ name: user.name, email: user.email }}
    />
  );
}
