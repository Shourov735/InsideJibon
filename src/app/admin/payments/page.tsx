import { requireAdmin } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import {
  getPendingApprovalCount,
  getDailyRevenueForDate,
  listAdminQueue,
} from "@/services/payments";
import { listBundlesByIds } from "@/services/payments";
import { getDb } from "@/db";
import { courses } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { AdminPaymentsQueue, type QueueStatus } from "@/components/admin/admin-payments-queue";
import { Stat } from "@/components/shared/ui/stat";
import { ClipboardIcon, CreditCardIcon } from "@/components/shared/ui/icons";

export const metadata = {
  title: "Payment approvals | InsideJibon",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    scope?: string;
    search?: string;
  }>;
}) {
  await requireAdmin();
  const t = await getTranslator();
  const sp = await searchParams;
  const filterStatus =
    sp.status === "submitted" ||
    sp.status === "under_review" ||
    sp.status === "approved" ||
    sp.status === "rejected" ||
    sp.status === "expired" ||
    sp.status === "refunded"
      ? sp.status
      : undefined;
  const filterScope =
    sp.scope === "bundle" || sp.scope === "course" ? sp.scope : undefined;

  const [{ items, total }, pendingCount, todaysRevenue] = await Promise.all([
    listAdminQueue({
      status: filterStatus,
      scopeKind: filterScope,
      search: sp.search,
      limit: 25,
    }),
    getPendingApprovalCount(),
    getDailyRevenueForDate(new Date()),
  ]);

  // Look up titles for each scope so the queue can render friendly names.
  const courseIds = Array.from(
    new Set(
      items
        .filter((item) => item.scopeKind === "course")
        .map((item) => item.scopeId)
    )
  );
  const bundleIds = Array.from(
    new Set(
      items
        .filter((item) => item.scopeKind === "bundle")
        .map((item) => item.scopeId)
    )
  );

  const db = getDb();
  const [courseRows, bundleRows] = await Promise.all([
    courseIds.length > 0
      ? db
          .select({ id: courses.id, title: courses.title, slug: courses.slug })
          .from(courses)
          .where(inArray(courses.id, courseIds))
      : Promise.resolve([] as Array<{ id: string; title: string; slug: string }>),
    bundleIds.length > 0
      ? listBundlesByIds(bundleIds)
      : Promise.resolve([] as Awaited<ReturnType<typeof listBundlesByIds>>),
  ]);

  const titleByScope = new Map<string, { title: string; slug: string | null }>();
  for (const row of courseRows) {
    titleByScope.set(`course:${row.id}`, { title: row.title, slug: row.slug });
  }
  for (const row of bundleRows) {
    titleByScope.set(`bundle:${row.id}`, { title: row.title, slug: row.slug });
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {t("payment.admin.title")}
        </h1>
        <p className="text-sm text-on-surface-variant">{t("payment.subtitle")}</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat
          label={t("payment.admin.todaysRevenue")}
          value={`৳${todaysRevenue.totalBdt.toFixed(2)}`}
          hint={`${todaysRevenue.approvedCount} approved`}
          tone="success"
          icon={<CreditCardIcon size={20} />}
        />
        <Stat
          label={t("payment.admin.pendingApprovals")}
          value={String(pendingCount)}
          hint={pendingCount === 0 ? "All clear" : "Needs attention"}
          tone={pendingCount > 0 ? "warning" : "neutral"}
          icon={<ClipboardIcon size={20} />}
        />
      </section>

      <AdminPaymentsQueue
        items={items.map((it) => ({
          id: it.id,
          status: it.status as QueueStatus,
          scopeKind: it.scopeKind,
          scopeId: it.scopeId,
          amountBdt: it.amountBdt,
          trxId: it.trxId,
          senderLast4: it.senderLast4,
          senderName: it.senderName,
          payerName: it.payerName,
          payerEmail: it.payerEmail,
          bkashNumber: it.bkashNumber,
          holderName: it.holderName,
          receiptNumber: it.receiptNumber,
          reviewNote: it.reviewNote,
          reviewedAt: it.reviewedAt,
          reviewedBy: it.reviewedBy,
          createdAt: it.createdAt,
          title: titleByScope.get(`${it.scopeKind}:${it.scopeId}`)?.title ?? it.scopeId,
          scopeSlug: titleByScope.get(`${it.scopeKind}:${it.scopeId}`)?.slug ?? null,
        }))}
        total={total}
        activeStatus={filterStatus ?? null}
        activeScope={filterScope ?? null}
        activeSearch={sp.search ?? ""}
      />
    </main>
  );
}