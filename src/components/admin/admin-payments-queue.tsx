"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "@/i18n/client";
import { formatBDT } from "@/lib/utils";
import {
  approvePaymentSubmissionAction,
  rejectPaymentSubmissionAction,
  startPaymentReviewAction,
} from "@/app/actions/payment-submissions-actions";

export type QueueStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "expired"
  | "refunded";

interface QueueItem {
  id: string;
  status: QueueStatus;
  scopeKind: "bundle" | "course";
  scopeId: string;
  amountBdt: number;
  trxId: string;
  senderLast4: string;
  senderName: string | null;
  payerName: string | null;
  payerEmail: string;
  bkashNumber: string;
  holderName: string;
  receiptNumber: string | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  createdAt: Date;
  title: string;
  scopeSlug: string | null;
}

interface AdminPaymentsQueueProps {
  items: QueueItem[];
  total: number;
  activeStatus: string | null;
  activeScope: string | null;
  activeSearch: string;
}

export function AdminPaymentsQueue({
  items,
  total,
  activeStatus,
  activeScope,
  activeSearch,
}: AdminPaymentsQueueProps) {
  const { t } = useTranslations();
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <FilterBar
        activeStatus={activeStatus}
        activeScope={activeScope}
        activeSearch={activeSearch}
      />

      {items.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-10 text-center text-sm text-on-surface-variant">
          {t("payment.admin.empty")}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((row) => (
            <QueueRow
              key={row.id}
              row={row}
              isOpen={openRowId === row.id}
              onToggle={() =>
                setOpenRowId((cur) => (cur === row.id ? null : row.id))
              }
              onError={setError}
            />
          ))}
        </ul>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <p className="text-xs text-on-surface-variant">
        {total} total
      </p>
    </div>
  );
}

function FilterBar({
  activeStatus,
  activeScope,
  activeSearch,
}: {
  activeStatus: string | null;
  activeScope: string | null;
  activeSearch: string;
}) {
  const { t } = useTranslations();
  const baseClasses =
    "rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-surface-container-low";
  const activeClasses =
    "border-primary bg-primary text-on-primary hover:opacity-90";

  const statusOptions = [
    { value: null, label: "All" },
    { value: "submitted", label: t("payment.status.submitted") },
    { value: "under_review", label: t("payment.status.under_review") },
    { value: "approved", label: t("payment.status.approved") },
    { value: "rejected", label: t("payment.status.rejected") },
    { value: "expired", label: t("payment.status.expired") },
    { value: "refunded", label: t("payment.status.refunded") },
  ];

  const scopeOptions = [
    { value: null, label: "All scopes" },
    { value: "course", label: "Course" },
    { value: "bundle", label: "Bundle" },
  ];

  return (
    <form className="flex flex-wrap items-center gap-2" method="get">
      <input
        name="search"
        defaultValue={activeSearch}
        placeholder="TrxID…"
        className="rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-xs"
      />
      <div className="flex flex-wrap items-center gap-1">
        {statusOptions.map((opt) => {
          const isActive = (activeStatus ?? null) === opt.value;
          return (
            <button
              key={`status-${opt.value ?? "all"}`}
              name="status"
              value={opt.value ?? ""}
              className={`${baseClasses} ${isActive ? activeClasses : ""}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {scopeOptions.map((opt) => {
          const isActive = (activeScope ?? null) === opt.value;
          return (
            <button
              key={`scope-${opt.value ?? "all"}`}
              name="scope"
              value={opt.value ?? ""}
              className={`${baseClasses} ${isActive ? activeClasses : ""}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <button
        type="submit"
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:opacity-90"
      >
        Apply
      </button>
    </form>
  );
}

function QueueRow({
  row,
  isOpen,
  onToggle,
  onError,
}: {
  row: QueueItem;
  isOpen: boolean;
  onToggle: () => void;
  onError: (msg: string) => void;
}) {
  const { t } = useTranslations();
  const [pending, startTransition] = useTransition();
  const [rejectNote, setRejectNote] = useState("");

  const statusBadge = statusToBadge(row.status, t);
  const isDecidable = row.status === "submitted" || row.status === "under_review";

  return (
    <li className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-2xs">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-on-surface">{row.title}</span>
            <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
              {row.scopeKind}
            </span>
            <span className={statusBadge.class}>{statusBadge.label}</span>
          </div>
          <p className="text-sm text-on-surface-variant">
            {row.payerName || row.payerEmail} · {formatBDT(row.amountBdt)}
          </p>
          <p className="text-xs text-on-surface-variant">
            Sent to {row.holderName} ({row.bkashNumber}) · last-4 {row.senderLast4}
          </p>
        </div>
        <div className="text-right text-xs text-on-surface-variant">
          <p>{new Date(row.createdAt).toLocaleString()}</p>
          <p>TrxID: <span className="font-mono">{row.trxId}</span></p>
        </div>
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-outline-variant px-5 py-4">
          <p className="text-xs text-on-surface-variant">
            {t("payment.admin.detail.backToQueue")}
          </p>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <DetailItem label="Scope">{row.title}</DetailItem>
            <DetailItem label={t("payment.checkout.amount")}>
              {formatBDT(row.amountBdt)}
            </DetailItem>
            <DetailItem label={t("payment.checkout.trxId")}>
              <span className="font-mono">{row.trxId}</span>
            </DetailItem>
            <DetailItem label={t("payment.checkout.senderLast4")}>
              {row.senderLast4}
            </DetailItem>
            <DetailItem label={t("payment.checkout.sendTo")}>
              {row.holderName} ({row.bkashNumber})
            </DetailItem>
            <DetailItem label={t("payment.checkout.senderName")}>
              {row.senderName ?? "—"}
            </DetailItem>
            {row.receiptNumber && (
              <DetailItem label={t("payment.admin.row.receipt")}>
                <span className="font-mono">{row.receiptNumber}</span>
              </DetailItem>
            )}
          </dl>

          {row.scopeSlug && (
            <Link
              href={
                row.scopeKind === "course"
                  ? `/courses/${row.scopeSlug}`
                  : `/bundles/${row.scopeSlug}`
              }
              className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
            >
              Open {row.scopeKind} →
            </Link>
          )}

          {isDecidable && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {row.status === "submitted" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await startPaymentReviewAction({
                          submissionId: row.id,
                        });
                        if (!result.success) {
                          onError(result.error ?? "Failed to claim");
                        }
                      })
                    }
                    className="rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-surface-container-low disabled:opacity-50"
                  >
                    {t("payment.admin.claim")}
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await approvePaymentSubmissionAction({
                        submissionId: row.id,
                        reviewNote: null,
                      });
                      if (!result.success) {
                        onError(result.error ?? "Failed to approve");
                      }
                    })
                  }
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
                >
                  {t("payment.admin.approve")}
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface-variant">
                  {t("payment.admin.reject")}
                </label>
                <textarea
                  rows={2}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder={t("payment.admin.rejectNotePlaceholder")}
                  className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  disabled={pending || rejectNote.trim().length < 10}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await rejectPaymentSubmissionAction({
                        submissionId: row.id,
                        reviewNote: rejectNote,
                      });
                      if (!result.success) {
                        onError(result.error ?? "Failed to reject");
                        return;
                      }
                      setRejectNote("");
                    })
                  }
                  className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {t("payment.admin.reject")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
        {label}
      </dt>
      <dd className="text-on-surface">{children}</dd>
    </div>
  );
}

function statusToBadge(
  status: QueueItem["status"],
  t: (key: Parameters<ReturnType<typeof useTranslations>["t"]>[0]) => string
): { class: string; label: string } {
  switch (status) {
    case "submitted":
      return {
        class:
          "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800",
        label: t("payment.status.submitted"),
      };
    case "under_review":
      return {
        class:
          "rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800",
        label: t("payment.status.under_review"),
      };
    case "approved":
      return {
        class:
          "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800",
        label: t("payment.status.approved"),
      };
    case "rejected":
      return {
        class:
          "rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-800",
        label: t("payment.status.rejected"),
      };
    case "expired":
      return {
        class:
          "rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700",
        label: t("payment.status.expired"),
      };
    case "refunded":
      return {
        class:
          "rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-800",
        label: t("payment.status.refunded"),
      };
  }
}