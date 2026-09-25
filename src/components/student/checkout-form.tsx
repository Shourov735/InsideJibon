"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "@/i18n/client";
import { formatBDT } from "@/lib/utils";
import { createPaymentSubmissionAction } from "@/app/actions/payment-submissions-actions";

interface CheckoutFormProps {
  scopeKind: "bundle" | "course";
  scopeId: string;
  scopeTitle: string;
  amountBdt: number;
  numbers: Array<{
    id: string;
    label: string;
    bkashNumber: string;
    holderName: string;
    instructions: string;
    whatsappNumber: string | null;
    whatsappTemplate: string | null;
  }>;
  hasRecentSubmission: boolean;
}

export function CheckoutForm({
  scopeKind,
  scopeId,
  scopeTitle,
  amountBdt,
  numbers,
  hasRecentSubmission,
}: CheckoutFormProps) {
  const { t } = useTranslations();
  const [numberId, setNumberId] = useState<string | null>(
    numbers[0]?.id ?? null
  );
  const [trxId, setTrxId] = useState("");
  const [senderLast4, setSenderLast4] = useState("");
  const [senderName, setSenderName] = useState("");
  const [payerNote, setPayerNote] = useState("");
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [screenshotKey, setScreenshotKey] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const selectedNumber = numbers.find((n) => n.id === numberId) ?? null;

  if (hasRecentSubmission) {
    return (
      <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        {t("payment.errors.duplicate")}
      </p>
    );
  }

  if (numbers.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        {t("payment.checkout.noActiveNumber")}
      </p>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
      <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs lg:col-span-2">
        <h2 className="text-base font-semibold text-on-surface">
          {t("payment.checkout.summary")}
        </h2>
        <p className="mt-2 text-sm text-on-surface">{scopeTitle}</p>
        <div className="mt-4 border-t border-outline-variant pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            {t("payment.checkout.amount")}
          </p>
          <p className="text-3xl font-bold text-primary">
            {formatBDT(amountBdt)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs lg:col-span-3">
        {success ? (
          <div className="space-y-2 text-sm text-on-surface">
            <p className="font-semibold text-emerald-700">
              {t("payment.checkout.submitted")}
            </p>
            <p>
              <Link
                href="/student/payments"
                className="text-primary hover:underline"
              >
                {t("payment.title")} →
              </Link>
            </p>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!numberId) return;
              startTransition(async () => {
                const result = await createPaymentSubmissionAction({
                  numberId,
                  scopeKind,
                  scopeId,
                  amountBdt,
                  trxId,
                  senderLast4,
                  senderName: senderName || null,
                  payerNote: payerNote || null,
                  whatsappSent,
                  screenshotKey: screenshotKey ?? null,
                });
                if (!result.success) {
                  setError(result.error ?? "Failed");
                  return;
                }
                setSuccess(true);
              });
            }}
          >
            <div>
              <label className="text-xs font-semibold text-on-surface-variant">
                {t("payment.checkout.sendTo")}
              </label>
              <select
                value={numberId ?? ""}
                onChange={(e) => setNumberId(e.target.value || null)}
                className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {numbers.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label} — {n.bkashNumber} ({n.holderName})
                  </option>
                ))}
              </select>

              {selectedNumber && (
                <div className="mt-3 space-y-2 rounded-lg border border-outline-variant bg-surface p-3 text-xs">
                  <p>
                    <span className="font-semibold">{t("payment.checkout.holder")}: </span>
                    {selectedNumber.holderName}
                  </p>
                  <p className="font-mono text-sm">
                    {selectedNumber.bkashNumber}
                  </p>
                  {selectedNumber.instructions && (
                    <p className="text-on-surface-variant">
                      <span className="font-semibold">{t("payment.checkout.instructions")}: </span>
                      {selectedNumber.instructions}
                    </p>
                  )}
                  {selectedNumber.whatsappNumber && selectedNumber.whatsappTemplate && (
                    <p className="text-on-surface-variant">
                      WhatsApp: {selectedNumber.whatsappNumber} —{" "}
                      {selectedNumber.whatsappTemplate
                        .replace("{amount}", formatBDT(amountBdt))
                        .replace("{trxid}", trxId || "{trxid}")}
                    </p>
                  )}
                </div>
              )}
            </div>

            <Field
              label={t("payment.checkout.trxId")}
              help={t("payment.errors.trxIdInvalid")}
            >
              <input
                required
                minLength={8}
                maxLength={40}
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </Field>

            <Field
              label={t("payment.checkout.senderLast4")}
              help={t("payment.errors.last4Invalid")}
            >
              <input
                required
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={senderLast4}
                onChange={(e) =>
                  setSenderLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </Field>

            <Field label={t("payment.checkout.senderName")}>
              <input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </Field>

            <Field label={t("payment.checkout.payerNote")}>
              <textarea
                rows={2}
                value={payerNote}
                onChange={(e) => setPayerNote(e.target.value)}
                className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </Field>

            {selectedNumber?.whatsappNumber && (
              <label className="flex items-center gap-2 text-xs text-on-surface">
                <input
                  type="checkbox"
                  checked={whatsappSent}
                  onChange={(e) => setWhatsappSent(e.target.checked)}
                  className="h-4 w-4 rounded border-outline-variant"
                />
                {t("payment.checkout.whatsappSent")}
              </label>
            )}

            <Field
              label={t("payment.checkout.screenshotHelp")}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setError(null);
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    const r = await fetch("/api/payments/screenshot", {
                      method: "POST",
                      body: fd,
                    });
                    if (!r.ok) {
                      const j = await r.json().catch(() => ({}));
                      throw new Error(j.error ?? "Upload failed");
                    }
                    const j = (await r.json()) as { key: string };
                    setScreenshotKey(j.key);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Upload failed");
                    setScreenshotKey(null);
                  }
                }}
                className="block w-full text-xs"
              />
              {screenshotKey && (
                <p className="mt-1 text-xs text-emerald-700">✓ Screenshot uploaded</p>
              )}
            </Field>

            {error && (
              <p
                role="alert"
                className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-800"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending || !trxId || senderLast4.length !== 4}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              {t("payment.checkout.submit")}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-on-surface-variant">{label}</span>
      {children}
      {help && (
        <span className="block text-[11px] text-on-surface-variant/80">{help}</span>
      )}
    </label>
  );
}