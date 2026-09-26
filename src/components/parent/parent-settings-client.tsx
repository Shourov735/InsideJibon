"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "@/i18n/client";
import { useToast } from "@/components/shared/feedback";
import {
  setDigestPreferenceAction,
  revokeParentLinkAction,
} from "@/app/actions/parent-actions";

interface ActiveChild {
  linkId: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string;
  cadence: "daily" | "weekly" | "off";
  sendHourUtc: number;
}

interface ParentSettingsClientProps {
  activeChildren: ActiveChild[];
  email: string;
}

type Cadence = "daily" | "weekly" | "off";

export function ParentSettingsClient({
  activeChildren,
  email,
}: ParentSettingsClientProps) {
  const { t } = useTranslations();
  if (activeChildren.length === 0) {
    return (
      <div className="bento-card-static p-8 text-center">
        <p className="text-sm text-secondary">{t("parent.settings.empty")}</p>
        <Link
          href="/parent"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
        >
          {t("parent.settings.backToDashboard")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bento-card-static p-5 sm:p-6 space-y-4">
        <header>
          <h2 className="font-display text-base font-bold text-on-surface">
            {t("parent.settings.cadenceHeading")}
          </h2>
          <p className="mt-1 text-xs text-secondary">
            {t("parent.settings.cadenceSubheading")}
          </p>
        </header>
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {t("parent.settings.emailRecipients", { email })}
        </p>
        <ul className="space-y-4">
          {activeChildren.map((child) => (
            <ChildSettingsCard key={child.linkId} child={child} />
          ))}
        </ul>
      </section>

      <section className="bento-card-static p-5 sm:p-6 space-y-3">
        <header>
          <h2 className="font-display text-base font-bold text-on-surface">
            {t("parent.settings.linkManagement.heading")}
          </h2>
          <p className="mt-1 text-xs text-secondary">
            {t("parent.settings.linkManagement.subheading")}
          </p>
        </header>
        <ul className="space-y-3">
          {activeChildren.map((child) => (
            <li
              key={`manage-${child.linkId}`}
              className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-on-surface">
                  {child.studentName ?? child.studentEmail}
                </p>
                <p className="text-[11px] text-secondary">{child.studentEmail}</p>
              </div>
              <RevokeButton linkId={child.linkId} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ChildSettingsCard({ child }: { child: ActiveChild }) {
  const { t } = useTranslations();
  const toast = useToast();
  const [cadence, setCadence] = useState<Cadence>(child.cadence);
  const [hour, setHour] = useState<number>(child.sendHourUtc);
  const [isPending, startTransition] = useTransition();

  const handlePersist = (nextCadence: Cadence, nextHour: number) => {
    startTransition(async () => {
      const result = await setDigestPreferenceAction({
        studentId: child.studentId,
        cadence: nextCadence,
        sendHourUtc: nextHour,
      });
      if (!result.success) {
        toast.error({
          title: t("parent.settings.cadenceError"),
          description: result.error ?? "",
        });
        return;
      }
      toast.success({
        title: t("parent.settings.cadenceSaved"),
      });
    });
  };

  return (
    <li className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm font-bold text-on-surface">
            {child.studentName ?? child.studentEmail}
          </p>
          <p className="text-[11px] text-secondary">{child.studentEmail}</p>
        </div>
        <CadenceSelector
          value={cadence}
          onChange={(next) => {
            setCadence(next);
            handlePersist(next, hour);
          }}
          disabled={isPending}
        />
      </div>
      {cadence !== "off" ? (
        <label className="flex items-center gap-3 text-xs">
          <span className="text-secondary">{t("parent.settings.sendHour")}</span>
          <select
            value={hour}
            disabled={isPending}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10);
              setHour(value);
              handlePersist(cadence, value);
            }}
            className="rounded-lg border border-outline-variant bg-surface-0 px-2 py-1 text-xs"
          >
            {Array.from({ length: 24 }).map((_, idx) => (
              <option key={idx} value={idx}>
                {idx.toString().padStart(2, "0")}:00 UTC
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </li>
  );
}

function CadenceSelector({
  value,
  onChange,
  disabled,
}: {
  value: Cadence;
  onChange: (next: Cadence) => void;
  disabled: boolean;
}) {
  const { t } = useTranslations();
  return (
    <div className="flex items-center gap-1 rounded-full bg-rose-50 p-1">
      {(["daily", "weekly", "off"] as const).map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            value === option
              ? "bg-rose-600 text-white shadow-2xs"
              : "text-rose-700 hover:bg-rose-100"
          }`}
          aria-pressed={value === option}
        >
          {t(`parent.settings.cadence.${option}`)}
        </button>
      ))}
    </div>
  );
}

function RevokeButton({ linkId }: { linkId: string }) {
  const { t } = useTranslations();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await revokeParentLinkAction({ linkId });
          if (!result.success) {
            toast.error({
              title: t("parent.link.revokeError"),
              description: result.error ?? "",
            });
            return;
          }
          toast.info({ title: t("parent.link.revoked") });
        });
      }}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 transition-colors"
    >
      {isPending ? "…" : t("parent.link.revoke")}
    </button>
  );
}
