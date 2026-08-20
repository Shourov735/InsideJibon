import { requireAdmin } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";

export default async function AdminDashboardPage() {
  const user = await requireAdmin();
  const t = await getTranslator();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("admin.title")}</h1>
      <p className="mt-2 text-on-surface-variant">
        {t("admin.welcome", { name: user.name ?? user.email })}
      </p>
    </main>
  );
}