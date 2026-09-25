"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "@/i18n/client";
import { formatBDT } from "@/lib/utils";
import { requestPaymentRefundAction } from "@/app/actions/payment-refunds-actions";

interface SubmissionShape {
  id: string;
  status:
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected"
    | "expired"
    | "refunded";
  scopeKind: "bundle" | "course";
  scopeId: string;
  scopeTitle: string | null;
  amountBdt: number;
  trxId: string;
  senderLast4: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  expiresAt: string;
}

interface RefundShape {
  id: string;
  status: "requested" | "approved" | "executed" | "rejected";
  amountBdt: number;
  reason: string | null;
  createdAt: string;
  executedAt: string | null;
  executionNote: string | null;
}

interface StudentPaymentStatusProps {
  submission: SubmissionShape;
  refunds: RefundShape[];
  hasAccess: boolean;
}

export function StudentPaymentStatus({
  submission,
  refunds,
  hasAccess,
}: StudentPaymentStatusProps) {
  const { t } = useTranslations();

  const heading = (() => {
    if (submission.status === "approved") {
      return t("payment.success.heading");
    }
    if (submission.status === "rejected") {
      return t("payment.status.rejected");
    }
    if (submission.status === "expired") {
      return t("payment.status.expired");
    }
    if (submission.status === "refunded") {
      return t("payment.refund.executed");
    }
    return t("payment.checkout.submitted");
  })();

  return (
    <article className="space-y-6">
      <header className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xs">
        <h1 className="text-xl font-bold tracking-tight text-on-surface">
          {heading}
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          {submission.scopeTitle ?? submission.scopeId}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <DetailItem label={t("payment.checkout.amount")}>
            {formatBDT(submission.amountBdt)}
          </DetailItem>
          <DetailItem label={t("payment.checkout.trxId")}>
            <span className="font-mono">{submission.trxId}</span>
          </DetailItem>
          <DetailItem label={t("payment.checkout.senderLast4")}>
            {submission.senderLast4}
          </DetailItem>
          <DetailItem label="Status">
            <span className={statusBadgeClass(submission.status, t)}>
              {t(`payment.status.${submission.status}`)}
            </span>
          </DetailItem>
        </dl>

        {submission.status === "approved" && hasAccess && (
          <Link
            href={
              submission.scopeKind === "course"
                ? `/courses/${submission.scopeId}`
                : `/bundles/${submission.scopeId}`
            }
            className="mt-5 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90"
          >
            {t("payment.success.cta.goToCourse")} →
          </Link>
        )}

        {submission.status === "rejected" && submission.reviewNote && (
          <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {submission.reviewNote}
          </div>
        )}
      </header>

      {submission.status === "approved" && refunds.length === 0 && (
        <RefundRequestCard submissionId={submission.id} />
      )}

      {refunds.length > 0 && (
        <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <h2 className="text-base font-semibold text-on-surface">
            {t("payment.refund.title")}
          </h2>
          <ul className="mt-3 space-y-3 text-sm">
            {refunds.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-outline-variant bg-surface p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{formatBDT(r.amountBdt)}</span>
                  <span className="text-xs text-on-surface-variant">
                    {t(
                      r.status === "requested"
                        ? "payment.refund.waitingForAdmin"
                        : (`payment.refund.${r.status}` as Parameters<typeof t>[0])
                    )}
                  </span>
                </div>
                {r.reason && (
                  <p className="mt-1 text-xs text-on-surface-variant">{r.reason}</p>
                )}
                {r.executionNote && (
                  <p className="mt-1 text-xs text-on-surface-variant">{r.executionNote}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function RefundRequestCard({ submissionId }: { submissionId: string }) {
  const { t } = useTranslations();
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
      <h2 className="text-base font-semibold text-on-surface">
        {t("payment.refund.requestRefund")}
      </h2>
      <textarea
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("payment.refund.reason")}
        className="mt-3 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      {error && (
        <p
          role="alert"
          className="mt-2 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-800"
        >
          {error}
        </p>
      )}
      {success && (
        <p className="mt-2 text-xs text-emerald-700">
          {t("payment.refund.waitingForAdmin")}
        </p>
      )}
      <button
        type="button"
        disabled={pending || reason.trim().length < 5}
        onClick={() =>
          startTransition(async () => {
            const result = await requestPaymentRefundAction({
              submissionId,
              reason,
            });
            if (!result.success) {
              setError(result.error ?? "Failed");
              return;
            }
            setSuccess(true);
            setReason("");
          })
        }
        className="mt-3 rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-surface-container-low disabled:opacity-50"
      >
        {t("payment.refund.requestRefund")}
      </button>
    </section>
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

function statusBadgeClass(
  status: SubmissionShape["status"],
  t: (key: Parameters<ReturnType<typeof useTranslations>["t"]>[0]) => string
): string {
  const label = t(`payment.status.${status}` as Parameters<typeof t>[0]);
  switch (status) {
    case "submitted":
      return "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 inline-block";
    case "under_review":
      return "rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800 inline-block";
    case "approved":
      return "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 inline-block";
    case "rejected":
      return "rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-800 inline-block";
    case "expired":
      return "rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700 inline-block";
    case "refunded":
      return "rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-800 inline-block";
  }
}