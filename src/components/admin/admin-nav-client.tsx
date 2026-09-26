"use client";

import type { CurrentUser } from "@/lib/auth";
import { AppHeader, type AppHeaderNavItem } from "@/components/shared/ui/app-header";
import {
  CreditCardIcon,
  HomeIcon,
  SettingsIcon,
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
      primaryNav: true,
    },
    {
      label: labels.payments,
      href: "/admin/payments",
      icon: <CreditCardIcon size={16} />,
      bottomNav: true,
      primaryNav: true,
      matchPrefix: "/admin/payments",
    },
    {
      label: labels.settings,
      href: "/admin/settings/payments",
      icon: <SettingsIcon size={16} />,
      bottomNav: true,
      primaryNav: true,
      matchPrefix: "/admin/settings",
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
