"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "@/i18n/client";
import { formatBDT } from "@/lib/utils";
import { createPaymentSubmissionAction } from "@/app/actions/payment-submissions-actions";
import { getWhatsAppEnrollmentUrl } from "@/lib/whatsapp";

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
  const { t, locale } = useTranslations();
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
    const whatsAppUrl = getWhatsAppEnrollmentUrl(scopeTitle, locale, amountBdt);
    return (
      <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 max-w-xl">
        <h3 className="text-base font-bold text-on-surface mb-2">
          {locale === "bn" ? "WhatsApp-এ সরাসরি যোগাযোগ ও ভর্তি অনুমোদন" : "Manual Enrollment via WhatsApp"}
        </h3>
        <p className="text-xs sm:text-sm leading-relaxed text-secondary mb-4">
          {locale === "bn"
            ? `অনলাইন গেটওয়ের পরিবর্তে সরাসরি WhatsApp-এর মাধ্যমে কোর্স ফি (${formatBDT(amountBdt)}) প্রদান করে শিক্ষকের সাথে যোগাযোগ করুন। শিক্ষক বা অ্যাডমিন পেমেন্ট যাচাই করে ম্যানুয়ালি আপনার কোর্স অনুমোদন করে দেবেন।`
            : `Please contact the teacher directly via WhatsApp to complete payment (${formatBDT(amountBdt)}). The teacher or admin will verify and manually approve your course.`}
        </p>
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-xs transition-all hover:shadow-md cursor-pointer"
        >
          <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.976.58 1.992.921 3.149.921l.002-.001c3.182 0 5.768-2.587 5.769-5.766.001-3.182-2.585-5.769-5.771-5.769zm3.364 8.163c-.14.394-.809.761-1.121.808-.288.043-.665.076-1.921-.444-1.608-.665-2.651-2.296-2.73-2.402-.079-.106-.649-.864-.649-1.648 0-.784.408-1.171.554-1.332.146-.161.32-.201.427-.201.107 0 .213.001.306.006.098.005.23-.037.36.275.14.336.478 1.166.52 1.252.043.086.071.188.014.302-.057.114-.086.185-.171.285-.086.1-.18.223-.257.3-.086.086-.176.18-.076.352.1.171.444.733.953 1.186.656.585 1.209.766 1.381.852.172.086.272.072.373-.044.101-.116.434-.505.549-.678.115-.173.23-.144.388-.086.158.058 1.002.472 1.174.558.172.086.287.129.33.201.043.072.043.418-.097.812zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.957-1.399C8.423 21.493 10.153 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
          </svg>
          <span>
            {locale === "bn"
              ? `WhatsApp-এ যোগাযোগ ও ভর্তি অনুমোদন (${formatBDT(amountBdt)}) →`
              : `Contact via WhatsApp & Request Approval (${formatBDT(amountBdt)}) →`}
          </span>
        </a>
      </div>
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