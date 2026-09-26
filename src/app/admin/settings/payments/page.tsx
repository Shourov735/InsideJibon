import { requireAdmin } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import { listAllNumbers } from "@/services/payments";
import { AdminPaymentNumbersManager } from "@/components/admin/payment-numbers-manager";

export const metadata = {
  title: "Payment settings | InsideJibon",
};

export default async function AdminPaymentsSettingsPage() {
  await requireAdmin();
  const t = await getTranslator();
  const numbers = await listAllNumbers();

  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {t("payment.admin.numbers.title")}
        </h1>
        <p className="text-sm text-on-surface-variant">
          {t("payment.subtitle")}
        </p>
      </header>

      <AdminPaymentNumbersManager initialNumbers={numbers.map((n) => ({
        id: n.id,
        label: n.label,
        bkashNumber: n.bkashNumber,
        holderName: n.holderName,
        instructions: n.instructions,
        whatsappNumber: n.whatsappNumber,
        whatsappTemplate: n.whatsappTemplate,
        status: n.status as "active" | "disabled",
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      }))} />
    </main>
  );
}