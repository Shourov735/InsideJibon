"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/i18n/client";

/**
 * R9 — Push opt-in modal.
 *
 * Surfaces on first notification-bell click OR when the user opens the
 * push preferences. Captures categories, persists the subscription via
 * `/api/push/subscribe`, and lets the user unsubscribe in one tap.
 *
 * The `Notification` API requires HTTPS and explicit user gesture; the
 * modal itself is the gesture. We do not auto-subscribe — the user must
 * click the primary button.
 *
 * Cost commitment: Web Push uses self-issued VAPID keys (no paid
 * middleman). The endpoint goes direct to Mozilla/Apple/Google push
 * gateways on the Worker outbound.
 */

type Category = "live_reminder" | "grade_posted" | "qa_replied" | "payment_receipt";

const ALL_CATEGORIES: Category[] = [
  "live_reminder",
  "grade_posted",
  "qa_replied",
  "payment_receipt",
];

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushOptInModalProps = {
  open: boolean;
  onClose: () => void;
  /** Pre-selected categories. Defaults to all when omitted. */
  initialCategories?: readonly Category[];
};

export function PushOptInModal({ open, onClose, initialCategories }: PushOptInModalProps) {
  const { t } = useTranslations();
  const [categories, setCategories] = useState<Category[]>(
    initialCategories ? [...initialCategories] : [...ALL_CATEGORIES]
  );
  const [status, setStatus] = useState<"idle" | "pending" | "subscribed" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const toggle = (c: Category) => {
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleSubscribe = async () => {
    setError(null);
    setStatus("pending");
    try {
      if (typeof window === "undefined") throw new Error("no-window");
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("push-unsupported");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("permission-denied");

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("no-vapid-key");

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            endpoint: json.endpoint,
            keys: json.keys,
          },
          categories,
          userAgent: navigator.userAgent,
          locale: document.documentElement.lang || "en",
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`server-rejected:${res.status}:${detail}`);
      }
      setStatus("subscribed");
      window.setTimeout(onClose, 1200);
    } catch (err) {
      setStatus("error");
      setError((err as Error).message || "unknown");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-optin-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/60 p-4 sm:items-center"
      data-testid="push-optin-modal"
    >
      <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-2xl ring-1 ring-outline-variant">
        <h2 id="push-optin-title" className="text-lg font-semibold text-on-surface">
          {t("push.optin.title")}
        </h2>
        <p className="mt-2 text-sm text-secondary">
          {t("push.optin.description")}
        </p>

        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">{t("push.optin.title")}</legend>
          {ALL_CATEGORIES.map((c) => (
            <label
              key={c}
              className="flex items-center gap-3 rounded-lg border border-outline-variant/60 px-3 py-2 text-sm hover:bg-surface-container-low cursor-pointer"
            >
              <input
                type="checkbox"
                checked={categories.includes(c)}
                onChange={() => toggle(c)}
                className="h-4 w-4 rounded border-outline-variant text-primary"
              />
              <span className="text-on-surface">{t(`push.categories.${c}`)}</span>
            </label>
          ))}
        </fieldset>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-md bg-error-container px-3 py-2 text-xs text-on-error-container"
          >
            {t("push.optin.error", { detail: error })}
          </p>
        ) : null}

        {status === "subscribed" ? (
          <p className="mt-3 rounded-md bg-primary-container px-3 py-2 text-xs text-on-primary-container">
            {t("push.optin.success")}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-secondary hover:bg-surface-container-low"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={status === "pending" || status === "subscribed"}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-60"
          >
            {status === "pending" ? t("push.optin.pending") : t("push.optin.subscribe")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PushOptInTrigger() {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-outline-variant/60 bg-surface-container-lowest px-3 py-1 text-xs font-medium text-secondary hover:bg-surface-container-low"
        data-testid="push-optin-trigger"
      >
        {t("push.optin.trigger")}
      </button>
      <PushOptInModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
