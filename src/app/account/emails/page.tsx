import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { emailUnsubscribes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getTranslator } from "@/i18n/server";
import { EmailPreferencesForm } from "@/components/account/email-preferences-form";

export const metadata = {
  title: "Email notifications — InsideJibon",
};

export const dynamic = "force-dynamic";

/**
 * R10 — `/account/emails` preferences page.
 *
 * Lists every email category with a toggle. Transactional emails
 * (receipts, refunds, grade posted) are disabled in the UI and labelled
 * "Required" — they cannot be opted out of, per §5 of the phase doc
 * (compliance).
 *
 * Loads the user's existing `email_unsubscribes` rows and seeds the
 * toggles with the inverse: subscribed-by-default unless explicitly
 * unsubscribed.
 */
export default async function EmailPreferencesPage() {
  const user = await getCurrentUser();
  const t = await getTranslator();

  const suppressed = new Set<string>();
  if (user) {
    const db = getDb();
    const rows = await db
      .select({ category: emailUnsubscribes.category })
      .from(emailUnsubscribes)
      .where(eq(emailUnsubscribes.email, user.email));
    for (const row of rows) suppressed.add(row.category);
  }

  const rows = [
    {
      category: "engagement" as const,
      title: t("email.common.category.engagement"),
      description: t("email.preferences.engagement.help"),
      enabled: !suppressed.has("engagement"),
    },
    {
      category: "marketing" as const,
      title: t("email.common.category.marketing"),
      description: t("email.preferences.marketing.help"),
      enabled: !suppressed.has("marketing"),
    },
    {
      category: "parent_digest" as const,
      title: t("email.common.category.parent_digest"),
      description: t("email.preferences.parent_digest.help"),
      enabled: !suppressed.has("parent_digest"),
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">
          {t("account.emails.title")}
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          {t("account.emails.description")}
        </p>
      </header>

      {/* Transactional notice — always shown so the user knows why they
          can't toggle receipts/refunds/grades. */}
      <div className="mb-6 rounded-xl border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">
        {t("email.preferences.description")}
      </div>

      {user ? (
        <EmailPreferencesForm
          rows={rows}
          locale={t.locale}
          saveLabel={t("email.preferences.saveAction")}
          savedLabel={t("email.preferences.saved")}
          unsubscribeAllLabel={t("account.emails.unsubscribeAll")}
          resubscribeAllLabel={t("account.emails.resubscribeAll")}
        />
      ) : (
        <p className="text-sm text-on-surface-variant">
          {t.locale === "bn"
            ? "প্রেফারেন্স দেখতে সাইন ইন করুন।"
            : "Sign in to manage your email preferences."}
        </p>
      )}
    </div>
  );
}
