"use client";

import { useTranslations } from "@/i18n/client";

/**
 * R9 — offline fallback shell.
 *
 * The service worker navigates here when the user is offline and the
 * requested route isn't in the precache. Static and copy-only — no
 * data fetches, no auth. Lives at /offline so it's precacheable.
 */
export default function OfflinePage() {
  const { t } = useTranslations();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold text-on-surface">
        {t("pwa.offline.title")}
      </h1>
      <p className="mt-3 text-base text-secondary">
        {t("pwa.offline.body")}
      </p>
      <p className="mt-6 text-sm text-secondary">
        {t("pwa.offline.retryHint")}
      </p>
    </main>
  );
}
