"use client";

import type { CurrentUser } from "@/lib/auth";
import { AppHeader, type AppHeaderNavItem } from "@/components/shared/ui/app-header";
import {
  ClipboardIcon,
  CreditCardIcon,
  HomeIcon,
  SettingsIcon,
  UsersIcon,
} from "@/components/shared/ui/icons";

interface AdminNavClientProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "users" | "payments" | "bundles" | "settings" | "queue";
  labels: {
    dashboard: string;
    users: string;
    payments: string;
    settings: string;
    queue: string;
    menu: string;
    more: string;
  };
}

export function AdminNavClient({ user, labels }: AdminNavClientProps) {
  const navItems: AppHeaderNavItem[] = [
    {
      label: labels.dashboard,
      href: "/admin",
      icon: <HomeIcon size={16} />,
      bottomNav: true,
    },
    {
      label: labels.users,
      href: "/admin",
      icon: <UsersIcon size={16} />,
      bottomNav: true,
    },
    {
      label: labels.queue,
      href: "/admin/payments",
      icon: <ClipboardIcon size={16} />,
      bottomNav: true,
    },
    {
      label: labels.payments,
      href: "/admin/payments",
      icon: <CreditCardIcon size={16} />,
      bottomNav: true,
    },
    {
      label: labels.settings,
      href: "/admin/settings/payments",
      icon: <SettingsIcon size={16} />,
      bottomNav: false,
    },
  ];

  return (
    <AppHeader
      variant="admin"
      roleBadge="ADMIN"
      navItems={navItems}
      user={{ name: user.name, email: user.email }}
    />
  );
}
