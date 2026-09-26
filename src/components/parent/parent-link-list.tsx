"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "@/i18n/client";
import { revokeParentLinkAction } from "@/app/actions/parent-actions";
import { useToast } from "@/components/shared/feedback";

interface ParentLinkListProps {
  links: Array<{
    linkId: string;
    studentName: string | null;
    studentEmail: string;
    status: "pending" | "active" | "revoked";
    cadence: "daily" | "weekly" | "off" | null;
    sendHourUtc: number | null;
  }>;
}

const statusStyles: Record<
  ParentLinkListProps["links"][number]["status"],
  string
> = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  revoked: "bg-rose-100 text-rose-700",
};

export function ParentLinkList({ links }: ParentLinkListProps) {
  const { t } = useTranslations();
  return (
    <section className="bento-card-static space-y-4 p-5 sm:p-6">
      <header className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-on-surface">
          {t("parent.linkList.title")}
        </h2>
        <Link
          href="/parent/settings"
          className="text-xs font-semibold text-rose-700 hover:underline"
        >
          {t("parent.linkList.manageCta")} →
        </Link>
      </header>
      {links.length === 0 ? (
        <p className="text-sm text-secondary">{t("parent.linkList.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {links.map((link) => (
            <li
              key={link.linkId}
              className="flex flex-col gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyles[link.status]}`}
                  >
                    {t(`parent.link.status.${link.status}`)}
                  </span>
                  <p className="truncate text-sm font-semibold text-on-surface">
                    {link.studentName ?? link.studentEmail}
                  </p>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-secondary">
                  {link.studentEmail}
                  {link.cadence
                    ? ` · ${t(`parent.settings.cadence.${link.cadence}`)}`
                    : ""}
                </p>
              </div>
              <LinkRow linkId={link.linkId} status={link.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LinkRow({
  linkId,
  status,
}: {
  linkId: string;
  status: ParentLinkListProps["links"][number]["status"];
}) {
  const { t } = useTranslations();
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const handleRevoke = () => {
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
  };
  if (status === "revoked") {
    return null;
  }
  return (
    <button
      type="button"
      onClick={handleRevoke}
      disabled={isPending}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 transition-colors"
    >
      {isPending ? "…" : t("parent.link.revoke")}
    </button>
  );
}
