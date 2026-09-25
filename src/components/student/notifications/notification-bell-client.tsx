"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useTranslations } from "@/i18n/client";
import { PushOptInModal } from "@/components/shared/push-opt-in-modal";

/**
 * Client mirror of the server-rendered bell.
 *
 * The bell renders as a Link + count badge. When the user hovers /
 * focuses the bell, a small "Enable notifications" affordance shows
 * if the browser has not yet granted push permission. Clicking the
 * affordance opens the opt-in modal — capturing the categories + the
 * user gesture `Notification.requestPermission()` requires.
 *
 * The actual unread count is the prop `initialCount`; we live-update
 * it when the SW dispatches a push (simple runtime enhancement).
 */
export function NotificationBellWithPush({
  initialCount,
}: {
  initialCount: number;
}) {
  const { t } = useTranslations();
  const [count, setCount] = useState(initialCount);
  const [pushState, setPushState] = useState<
    "default" | "granted" | "denied" | "unsupported"
  >("default");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPushState("unsupported");
      return;
    }
    setPushState(Notification.permission as typeof pushState);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) setPushState("granted");
        })
        .catch(() => undefined);
    }
  }, []);

  return (
    <div className="relative inline-flex items-center gap-1">
      <Link
        href="/student/notifications"
        className="relative p-2 text-gray-400 hover:text-gray-500"
        aria-label={t("nav.notifications")}
      >
        <span className="sr-only">{t("nav.notifications")}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 ? (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
            {count > 9 ? "9+" : count.toString()}
          </span>
        ) : null}
      </Link>
      {pushState === "default" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full px-2 py-0.5 text-[10px] font-medium text-secondary hover:bg-surface-container-low"
          aria-label={t("push.optin.trigger")}
        >
          {t("push.optin.trigger")}
        </button>
      ) : null}
      <PushOptInModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
