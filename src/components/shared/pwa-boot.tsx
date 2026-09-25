"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/i18n/client";

/**
 * R9 — Service Worker registration + install banner + offline pill.
 *
 * Mounts once near the root of the layout. Responsibilities:
 *   1. Register /sw.js (production only — dev mode is noisy).
 *   2. Listen for `beforeinstallprompt` and surface an "Install
 *      InsideJibon" affordance after the user has visited ≥2 times.
 *   3. Show an offline-state pill in the nav when `navigator.onLine`
 *      transitions to false; show a reconnection toast on return.
 *   4. Bridge SW messages to the rest of the app — push opt-in modal
 *      dispatcher, "Synced N drafts" toast.
 *
 * Styling intentionally uses shared Tailwind tokens — no new tokens here.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const VISITS_KEY = "ij_pwa_visits";
const DISMISS_KEY = "ij_pwa_install_dismissed_v1";

export function PwaBoot() {
  const { t, tn } = useTranslations();
  const [online, setOnline] = useState(true);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [syncedNotice, setSyncedNotice] = useState<{
    synced: number;
    remaining: number;
  } | null>(null);

  useEffect(() => {
    // Service worker is registered only on the same origin over HTTPS
    // (browsers refuse insecure origins for SW).
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      return;
    }
    if (process.env.NODE_ENV === "development") return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.error("[pwa] SW register failed", err));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const setOnlineFromNavigator = () => setOnline(navigator.onLine);
    setOnlineFromNavigator();
    window.addEventListener("online", setOnlineFromNavigator);
    window.addEventListener("offline", setOnlineFromNavigator);
    return () => {
      window.removeEventListener("online", setOnlineFromNavigator);
      window.removeEventListener("offline", setOnlineFromNavigator);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const visits = Number(window.localStorage.getItem(VISITS_KEY) ?? "0") + 1;
    window.localStorage.setItem(VISITS_KEY, String(visits));

    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    const handler = (event: Event) => {
      const e = event as BeforeInstallPromptEvent;
      // Only show after the second visit AND not previously dismissed.
      if (visits >= 2 && !dismissed) {
        setInstallPromptEvent(e);
        setInstallAvailable(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "OUTBOX_FLUSH_RESULT") {
        if (data.synced > 0) {
          setSyncedNotice({ synced: data.synced, remaining: data.remaining });
          window.setTimeout(
            () => setSyncedNotice(null),
            4000
          );
        }
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  const handleInstall = async () => {
    if (!installPromptEvent) return;
    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    if (choice.outcome === "dismissed") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setInstallPromptEvent(null);
    setInstallAvailable(false);
  };

  const handleDismissInstall = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setInstallAvailable(false);
  };

  return (
    <>
      {!online ? (
        <div
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-surface-container-highest px-4 py-1.5 text-xs font-medium text-secondary shadow-lg ring-1 ring-outline-variant"
          data-testid="pwa-offline-pill"
        >
          {t("pwa.offline.banner")}
        </div>
      ) : null}

      {syncedNotice && syncedNotice.synced > 0 ? (
        <div
          aria-live="polite"
          className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-on-primary shadow-lg"
          data-testid="pwa-reconnected-toast"
        >
          {tn("pwa.offline.syncedDrafts", syncedNotice.synced)}
        </div>
      ) : null}

      {installAvailable ? (
        <div
          role="region"
          aria-label={t("pwa.install.title")}
          className="fixed bottom-4 right-4 z-40 max-w-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xl"
          data-testid="pwa-install-banner"
        >
          <p className="text-sm font-medium text-on-surface">
            {t("pwa.install.title")}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {t("pwa.install.body")}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleDismissInstall}
              className="rounded-full px-3 py-1 text-xs font-medium text-secondary hover:bg-surface-container-low"
            >
              {t("pwa.install.dismissed")}
            </button>
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-on-primary hover:bg-primary/90"
            >
              {t("pwa.install.button")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
