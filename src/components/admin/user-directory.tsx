"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import { useTranslations } from "@/i18n/client";
import type { User } from "@/db/schema";
import type { Role } from "@/db/schema";
import { RoleBadge } from "./role-badge";
import { ChangeRoleDialog } from "./change-role-dialog";
import { updateUserRoleAction } from "@/app/admin/actions/admin-actions";

import { ResponsiveTable, type ResponsiveTableColumn } from "@/components/shared/ui/responsive-table";

interface UserDirectoryProps {
  users: User[];
  currentUserId: string;
}

export function UserDirectory({ users: initialUsers, currentUserId }: UserDirectoryProps) {
  const { t, locale } = useTranslations();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
    return initialUsers.filter((u) => {
      const matchesSearch =
        (u.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (u.email?.toLowerCase() || "").includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [initialUsers, search, roleFilter]);

  const handleRoleChange = (newRole: Role) => {
    if (!selectedUser) return;
    
    startTransition(async () => {
      const result = await updateUserRoleAction({
        userId: selectedUser.id,
        newRole,
      });
      if (result.success) {
        setSelectedUser(null);
      } else {
        alert(result.error);
      }
    });
  };

  const columns: ResponsiveTableColumn<User>[] = [
    {
      header: "User",
      className: "w-2/5",
      mobilePrimary: true,
      cell: (user) => (
        <div className="flex items-center gap-3">
          {user.imageUrl ? (
            <Image src={user.imageUrl} alt="" width={36} height={36} className="rounded-full shrink-0 border border-outline-variant object-cover" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
              {(user.name || user.email || "?").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink-900 text-sm">{user.name || "Unknown"}</div>
            <div className="truncate text-xs text-ink-500">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      mobileLabel: "Role",
      cell: (user) => <RoleBadge role={user.role} />,
    },
    {
      header: "Joined",
      mobileLabel: "Joined",
      cell: (user) => (
        <span className="text-xs text-ink-500 font-medium">
          {new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(new Date(user.createdAt))}
        </span>
      ),
    },
    {
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (user) => (
        user.id !== currentUserId ? (
          <button
            type="button"
            onClick={() => setSelectedUser(user)}
            className="inline-flex items-center rounded-xl bg-surface-1 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-container hover:text-on-primary-container transition-colors"
          >
            {t("admin.users.changeRole")}
          </button>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder={t("admin.users.searchPlaceholder")}
          aria-label={t("admin.users.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs rounded-2xl border border-outline-variant bg-surface-0 px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
        />
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "all" | Role)}
          className="w-full sm:w-auto rounded-2xl border border-outline-variant bg-surface-0 px-4 py-2.5 text-sm text-ink-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
        >
          <option value="all">{t("admin.users.allRoles")}</option>
          <option value="student">{t("admin.users.student")}</option>
          <option value="teacher">{t("admin.users.teacher")}</option>
          <option value="admin">{t("admin.users.admin")}</option>
        </select>
      </div>

      <ResponsiveTable
        columns={columns}
        rows={filteredUsers}
        rowKey={(u) => u.id}
        emptyState={t("admin.users.noUsers")}
        mobileLeading={(user) => (
          <div className="flex items-center gap-3">
            {user.imageUrl ? (
              <Image src={user.imageUrl} alt="" width={40} height={40} className="rounded-full shrink-0 border border-outline-variant object-cover" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
                {(user.name || user.email || "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-ink-900 text-sm">{user.name || "Unknown"}</div>
              <div className="truncate text-xs text-ink-500">{user.email}</div>
            </div>
          </div>
        )}
        mobileTrailing={(user) => (
          user.id !== currentUserId ? (
            <button
              type="button"
              onClick={() => setSelectedUser(user)}
              className="inline-flex items-center rounded-xl bg-surface-1 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-container hover:text-on-primary-container transition-colors"
            >
              {t("admin.users.changeRole")}
            </button>
          ) : null
        )}
      />

      <ChangeRoleDialog
        isOpen={!!selectedUser}
        onClose={() => !isPending && setSelectedUser(null)}
        onConfirm={handleRoleChange}
        currentRole={selectedUser?.role || "student"}
        userName={selectedUser?.name || selectedUser?.email || ""}
        isPending={isPending}
      />
    </div>
  );
}

