"use client";

import { useTransition } from "react";
import { useTranslations } from "@/i18n/client";
import {
  acceptParentLinkAction,
  studentRevokeParentAction,
} from "@/app/actions/parent-actions";
import { useToast } from "@/components/shared/feedback";

interface ParentRow {
  linkId: string;
  parentName: string | null;
  parentEmail: string;
  status: "pending" | "active" | "revoked";
  invitedAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
}

interface LinkedFamilySectionProps {
  parents: ParentRow[];
}

/**
 * R7 §4.3 — Student-side Linked Family card on /student/profile.
 *
 * Shows every parent that has requested to view this student's
 * progress and offers Approve / Revoke actions. The card is *only*
 * rendered when at least one parent row exists OR a student has been
 * told that the feature exists — kept compact so it doesn't crowd the
 * profile page when unused.
 */
export function LinkedFamilySection({ parents }: LinkedFamilySectionProps) {
  const { t } = useTranslations();
  if (parents.length === 0) return null;

  return (
    <section className="bento-card-static p-5 sm:p-6 space-y-4">
      <header>
        <h2 className="text-xs font-bold uppercase tracking-wider text-rose-700">
          {t("parent.family.heading")}
        </h2>
        <p className="mt-1 text-xs text-secondary">
          {t("parent.family.subheading")}
        </p>
      </header>
      <ul className="space-y-3">
        {parents.map((parent) => (
          <ParentRowItem key={parent.linkId} parent={parent} />
        ))}
      </ul>
    </section>
  );
}

function ParentRowItem({ parent }: { parent: ParentRow }) {
  const { t, locale } = useTranslations();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      const result = await acceptParentLinkAction({ linkId: parent.linkId });
      if (!result.success) {
        toast.error({
          title: t("parent.link.acceptError"),
          description: result.error ?? "",
        });
        return;
      }
      toast.success({ title: t("parent.link.accepted") });
    });
  };

  const handleRevoke = () => {
    startTransition(async () => {
      const result = await studentRevokeParentAction({
        linkId: parent.linkId,
      });
      if (!result.success) {
        toast.error({
          title: t("parent.link.revokeError"),
          description: result.error ?? "",
        });
        return;
      }
      toast.info({ title: t("parent.link.revoked") });
    });
  };

  const statusClasses: Record<ParentRow["status"], string> = {
    pending: "bg-amber-100 text-amber-700",
    active: "bg-emerald-100 text-emerald-700",
    revoked: "bg-rose-100 text-rose-700",
  };

  const displayTime = parent.acceptedAt ?? parent.invitedAt;

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusClasses[parent.status]}`}
          >
            {t(`parent.family.status.${parent.status}`)}
          </span>
          <p className="truncate text-sm font-semibold text-on-surface">
            {parent.parentName ?? parent.parentEmail}
          </p>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-secondary">
          {parent.parentEmail}
          {displayTime
            ? ` · ${formatDateTime(displayTime, locale)}`
            : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {parent.status === "pending" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={handleApprove}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-60"
          >
            {isPending ? "…" : t("parent.family.approve")}
          </button>
        ) : null}
        {parent.status !== "revoked" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={handleRevoke}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            {isPending ? "…" : t("parent.link.revoke")}
          </button>
        ) : null}
      </div>
    </li>
  );
}

function formatDateTime(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(
      locale === "bn" ? "bn-BD" : "en-US",
      { dateStyle: "medium", timeStyle: "short" }
    ).format(new Date(iso));
  } catch {
    return iso;
  }
}
