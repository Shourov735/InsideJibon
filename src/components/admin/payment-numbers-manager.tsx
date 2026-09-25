"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "@/i18n/client";
import {
  createPaymentNumberAction,
  updatePaymentNumberAction,
  setPaymentNumberStatusAction,
} from "@/app/actions/payment-numbers-actions";

interface NumberRow {
  id: string;
  label: string;
  bkashNumber: string;
  holderName: string;
  instructions: string;
  whatsappNumber: string | null;
  whatsappTemplate: string | null;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}

interface AdminPaymentNumbersManagerProps {
  initialNumbers: NumberRow[];
}

export function AdminPaymentNumbersManager({ initialNumbers }: AdminPaymentNumbersManagerProps) {
  const { t } = useTranslations();
  const [numbers, setNumbers] = useState<NumberRow[]>(initialNumbers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <AddNumberForm
        onCreated={(row) => {
          setNumbers((prev) => [row, ...prev]);
          setError(null);
        }}
        onError={setError}
        pending={pending}
        startTransition={startTransition}
      />

      <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xs">
        <header className="border-b border-outline-variant px-5 py-4">
          <h2 className="text-base font-semibold text-on-surface">
            {t("payment.admin.numbers.title")}
          </h2>
        </header>
        {numbers.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-on-surface-variant">
            {t("payment.admin.numbers.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {numbers.map((row) => (
              <li key={row.id} className="px-5 py-4 space-y-3">
                {editingId === row.id ? (
                  <EditNumberForm
                    row={row}
                    onSaved={(updated) => {
                      setNumbers((prev) =>
                        prev.map((p) => (p.id === updated.id ? updated : p))
                      );
                      setEditingId(null);
                      setError(null);
                    }}
                    onCancel={() => setEditingId(null)}
                    onError={setError}
                    startTransition={startTransition}
                  />
                ) : (
                  <NumberRow
                    row={row}
                    pending={pending}
                    onEdit={() => setEditingId(row.id)}
                    onDisable={() =>
                      startTransition(async () => {
                        setError(null);
                        const next = row.status === "active" ? "disabled" : "active";
                        const result = await setPaymentNumberStatusAction({
                          id: row.id,
                          status: next,
                        });
                        if (!result.success) {
                          setError(result.error ?? "Failed to update");
                          return;
                        }
                        setNumbers((prev) =>
                          prev.map((p) =>
                            p.id === row.id ? { ...p, status: next } : p
                          )
                        );
                      })
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function AddNumberForm({
  onCreated,
  onError,
  pending,
  startTransition,
}: {
  onCreated: (row: NumberRow) => void;
  onError: (msg: string) => void;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  const { t } = useTranslations();
  const [label, setLabel] = useState("");
  const [bkashNumber, setBkashNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");

  function reset() {
    setLabel("");
    setBkashNumber("");
    setHolderName("");
    setInstructions("");
    setWhatsappNumber("");
    setWhatsappTemplate("");
  }

  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
      <h2 className="text-base font-semibold text-on-surface">
        {t("payment.admin.numbers.add")}
      </h2>
      <form
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await createPaymentNumberAction({
              label,
              bkashNumber,
              holderName,
              instructions,
              whatsappNumber: whatsappNumber || null,
              whatsappTemplate: whatsappTemplate || null,
            });
            if (!result.success) {
              onError(result.error ?? "Failed to add number");
              return;
            }
            onCreated({
              id: crypto.randomUUID(),
              label,
              bkashNumber,
              holderName,
              instructions,
              whatsappNumber: whatsappNumber || null,
              whatsappTemplate: whatsappTemplate || null,
              status: "active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            reset();
          });
        }}
      >
        <FormField label={t("payment.admin.numbers.form.label")}>
          <input
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </FormField>
        <FormField label={t("payment.admin.numbers.form.number")}>
          <input
            required
            inputMode="numeric"
            value={bkashNumber}
            onChange={(e) => setBkashNumber(e.target.value)}
            placeholder="01712345678"
            className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </FormField>
        <FormField label={t("payment.admin.numbers.form.holder")}>
          <input
            required
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </FormField>
        <FormField label={t("payment.admin.numbers.form.instructions")}>
          <input
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Use Send Money, not Payment"
            className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </FormField>
        <FormField label={t("payment.admin.numbers.form.whatsappNumber")}>
          <input
            inputMode="numeric"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="88017XXXXXXXX"
            className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </FormField>
        <FormField
          label={t("payment.admin.numbers.form.whatsappTemplate")}
          help={t("payment.admin.numbers.whatsappTemplateHelp")}
        >
          <textarea
            rows={2}
            value={whatsappTemplate}
            onChange={(e) => setWhatsappTemplate(e.target.value)}
            placeholder={`I've sent ৳{amount}. TrxID: {trxid}.`}
            className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </FormField>

        <div className="sm:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {t("payment.admin.numbers.add")}
          </button>
        </div>
      </form>
    </section>
  );
}

function NumberRow({
  row,
  pending,
  onEdit,
  onDisable,
}: {
  row: NumberRow;
  pending: boolean;
  onEdit: () => void;
  onDisable: () => void;
}) {
  const { t } = useTranslations();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-on-surface">{row.label}</h3>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              row.status === "active"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-surface-container-high text-secondary"
            }`}
          >
            {row.status}
          </span>
        </div>
        <p className="text-sm text-on-surface-variant">
          <span className="font-mono">{row.bkashNumber}</span> · {row.holderName}
        </p>
        {row.instructions && (
          <p className="text-xs text-on-surface-variant">{row.instructions}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-surface-container-low"
        >
          {t("payment.admin.numbers.edit")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onDisable}
          className="rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-surface-container-low disabled:opacity-50"
        >
          {row.status === "active"
            ? t("payment.admin.numbers.disable")
            : t("payment.admin.numbers.enable")}
        </button>
      </div>
    </div>
  );
}

function EditNumberForm({
  row,
  onSaved,
  onCancel,
  onError,
  startTransition,
}: {
  row: NumberRow;
  onSaved: (updated: NumberRow) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
  startTransition: (cb: () => void) => void;
}) {
  const { t } = useTranslations();
  const [label, setLabel] = useState(row.label);
  const [bkashNumber, setBkashNumber] = useState(row.bkashNumber);
  const [holderName, setHolderName] = useState(row.holderName);
  const [instructions, setInstructions] = useState(row.instructions);
  const [whatsappNumber, setWhatsappNumber] = useState(row.whatsappNumber ?? "");
  const [whatsappTemplate, setWhatsappTemplate] = useState(row.whatsappTemplate ?? "");

  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await updatePaymentNumberAction({
            id: row.id,
            label,
            bkashNumber,
            holderName,
            instructions,
            whatsappNumber: whatsappNumber || null,
            whatsappTemplate: whatsappTemplate || null,
          });
          if (!result.success) {
            onError(result.error ?? "Failed to update");
            return;
          }
          onSaved({
            ...row,
            label,
            bkashNumber,
            holderName,
            instructions,
            whatsappNumber: whatsappNumber || null,
            whatsappTemplate: whatsappTemplate || null,
            updatedAt: new Date().toISOString(),
          });
        });
      }}
    >
      <FormField label={t("payment.admin.numbers.form.label")}>
        <input
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </FormField>
      <FormField label={t("payment.admin.numbers.form.number")}>
        <input
          required
          value={bkashNumber}
          onChange={(e) => setBkashNumber(e.target.value)}
          className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </FormField>
      <FormField label={t("payment.admin.numbers.form.holder")}>
        <input
          required
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </FormField>
      <FormField label={t("payment.admin.numbers.form.instructions")}>
        <input
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </FormField>
      <FormField label={t("payment.admin.numbers.form.whatsappNumber")}>
        <input
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </FormField>
      <FormField label={t("payment.admin.numbers.form.whatsappTemplate")}>
        <textarea
          rows={2}
          value={whatsappTemplate}
          onChange={(e) => setWhatsappTemplate(e.target.value)}
          className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </FormField>

      <div className="sm:col-span-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-container-low"
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90"
        >
          {t("common.saved")}
        </button>
      </div>
    </form>
  );
}

function FormField({
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