import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";
import { getTranslator } from "@/i18n/server";

export const metadata = {
  title: "Account Setup",
};

export const dynamic = "force-dynamic";

/**
 * Shown when a Clerk session is verified but the application user row has
 * not been created yet (webhook in flight). Offers a retry that re-runs
 * the authorized redirect once the sync lands.
 */
export default async function AccountPendingPage() {
  const t = await getTranslator();
  const user = await getCurrentUser();

  // Sync landed while the user sat on this page — send them to their
  // dashboard immediately instead of making them read the notice.
  if (user) {
    redirect(dashboardPathForRole(user.role));
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <svg className="h-7 w-7 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="mt-5 font-display text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
        {t("accountPending.title")}
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
        {t("accountPending.subtitle")}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/account-pending"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container hover:text-on-primary-container"
        >
          {t("accountPending.retry")}
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-primary hover:underline"
        >
          {t("accountPending.backHome")}
        </Link>
      </div>
    </main>
  );
}
