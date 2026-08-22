"use client";

import { useTranslations } from "@/i18n/client";

interface ChangeRoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (role: "student" | "teacher" | "admin") => void;
  currentRole: "student" | "teacher" | "admin";
  userName: string;
  isPending: boolean;
}

export function ChangeRoleDialog({
  isOpen,
  onClose,
  onConfirm,
  currentRole,
  userName,
  isPending,
}: ChangeRoleDialogProps) {
  const { t } = useTranslations();

  if (!isOpen) return null;

  const roles = ["student", "teacher", "admin"] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="change-role-dialog-title">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
        <h3 id="change-role-dialog-title" className="text-lg font-bold text-on-surface">
          {t("admin.users.changeRole")}
        </h3>
        <p className="mt-2 text-sm text-on-surface-variant">
          {t("admin.users.changeRoleConfirm", { 
            name: userName, 
          })}
        </p>

        <div className="mt-4 space-y-2">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => onConfirm(role)}
              disabled={isPending || role === currentRole}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                role === currentRole
                  ? "border-primary bg-primary/10"
                  : "border-outline-variant hover:bg-surface-container-low"
              } disabled:opacity-50`}
            >
              <div className="font-semibold text-on-surface capitalize">{t(`admin.users.${role}`)}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-secondary hover:bg-surface-container-low"
          >
            {t("teacher.courseForm.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

