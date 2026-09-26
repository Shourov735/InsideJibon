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

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-0 p-4 shadow-academic sm:flex-row sm:items-center sm:justify-between"
      method="get"
    >
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            name="search"
            defaultValue={activeSearch}
            placeholder="Search TrxID, email or sender..."
            aria-label="Search transaction or student"
            className="w-full rounded-xl border border-outline-variant bg-surface-1 py-2 pl-9 pr-4 text-xs text-ink-900 transition-colors placeholder:text-ink-500 focus:border-primary focus:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <select
            name="status"
            defaultValue={activeStatus ?? ""}
            aria-label="Filter by payment status"
            className="rounded-xl border border-outline-variant bg-surface-1 px-3 py-2 text-xs font-semibold text-ink-900 transition-colors focus:border-primary focus:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="submitted">{t("payment.status.submitted")}</option>
            <option value="under_review">{t("payment.status.under_review")}</option>
            <option value="approved">{t("payment.status.approved")}</option>
            <option value="rejected">{t("payment.status.rejected")}</option>
            <option value="expired">{t("payment.status.expired")}</option>
            <option value="refunded">{t("payment.status.refunded")}</option>
          </select>

          {/* Scope Dropdown */}
          <select
            name="scope"
            defaultValue={activeScope ?? ""}
            aria-label="Filter by scope"
            className="rounded-xl border border-outline-variant bg-surface-1 px-3 py-2 text-xs font-semibold text-ink-900 transition-colors focus:border-primary focus:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Scopes</option>
            <option value="course">Course</option>
            <option value="bundle">Bundle</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary/90 cursor-pointer"
        >
          Filter / ফিল্টার
        </button>
        {(activeStatus || activeScope || activeSearch) ? (
          <Link
            href="/admin/payments"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-outline-variant bg-surface-0 px-3 text-xs font-medium text-ink-500 hover:bg-surface-1 hover:text-ink-900"
          >
            Clear
          </Link>
        ) : null}
      </div>
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
    <li className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-0 shadow-academic transition-[box-shadow] duration-200 hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 sm:p-5 text-left cursor-pointer"
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-bold text-ink-900 text-sm sm:text-base">{row.title}</span>
            <span className="rounded-full bg-surface-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-500">
              {row.scopeKind}
            </span>
            <span className={statusBadge.class}>{statusBadge.label}</span>
          </div>
          <p className="text-sm font-semibold text-primary">
            {row.payerName || row.payerEmail} · {formatBDT(row.amountBdt)}
          </p>
          <p className="text-xs text-ink-500">
            Sent to {row.holderName} ({row.bkashNumber}) · last-4 <span className="font-mono font-bold text-ink-700">{row.senderLast4}</span>
          </p>
        </div>
        <div className="sm:text-right text-xs text-ink-500 shrink-0">
          <p>{new Date(row.createdAt).toLocaleDateString()} {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="mt-0.5">TrxID: <span className="font-mono font-bold text-ink-900">{row.trxId}</span></p>
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