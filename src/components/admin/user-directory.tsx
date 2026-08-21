"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import { useTranslations } from "@/i18n/client";
import type { User } from "@/db/schema";
import { RoleBadge } from "./role-badge";
import { ChangeRoleDialog } from "./change-role-dialog";
import { updateUserRoleAction } from "@/app/admin/actions/admin-actions";

interface UserDirectoryProps {
  users: User[];
  currentUserId: string;
}

export function UserDirectory({ users: initialUsers, currentUserId }: UserDirectoryProps) {
  const { t } = useTranslations();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "teacher" | "admin">("all");
  
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

  const handleRoleChange = (newRole: "student" | "teacher" | "admin") => {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder={t("admin.users.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "all" | "student" | "teacher" | "admin")}
          className="w-full sm:w-auto rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">{t("admin.users.allRoles")}</option>
          <option value="student">{t("admin.users.student")}</option>
          <option value="teacher">{t("admin.users.teacher")}</option>
          <option value="admin">{t("admin.users.admin")}</option>
        </select>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low text-secondary border-b border-outline-variant">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-secondary">
                  {t("admin.users.noUsers")}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-surface-container-lowest/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.imageUrl ? (
                        <Image src={user.imageUrl} alt="" width={32} height={32} className="rounded-full" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-surface-container-high" />
                      )}
                      <div>
                        <div className="font-medium text-on-surface">{user.name || "Unknown"}</div>
                        <div className="text-xs text-secondary">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {t("admin.users.changeRole")}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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

