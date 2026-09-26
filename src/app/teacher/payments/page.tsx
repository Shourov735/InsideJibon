import { requireTeacher } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import { listTeacherQueue } from "@/services/payments";
import { getDb } from "@/db";
import { courses } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { Badge } from "@/components/shared/ui/badge";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { CreditCardIcon } from "@/components/shared/ui/icons";
import { formatNumber } from "@/lib/utils";

export const metadata = {
  title: "Course payments | InsideJibon",
};

type PaymentStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "expired"
  | "refunded";

const STATUS_TONE: Record<PaymentStatus, "muted" | "warning" | "success" | "danger"> = {
  submitted: "muted",
  under_review: "warning",
  approved: "success",
  rejected: "danger",
  expired: "warning",
  refunded: "muted",
};

export default async function TeacherPaymentsPage() {
  const teacher = await requireTeacher();
  const t = await getTranslator();

  const items = await listTeacherQueue(teacher.id);

  const courseIds = Array.from(new Set(items.map((i) => i.scopeId)));
  const db = getDb();
  const courseRows =
    courseIds.length > 0
      ? await db
          .select({
            id: courses.id,
            title: courses.title,
            slug: courses.slug,
          })
          .from(courses)
          .where(inArray(courses.id, courseIds))
      : [];
  const titleById = new Map(courseRows.map((c) => [c.id, c]));

  return (
    <Container className="py-6 sm:py-8" size="lg">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <CreditCardIcon size={14} />
            {t("payment.teacher.queue")}
          </span>
        }
        title={t("payment.teacher.queue")}
        description={t("payment.subtitle")}
      />

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState
            icon={<CreditCardIcon size={20} />}
            title={t("payment.admin.empty")}
          />
        ) : (
          <ul className="space-y-3">
            {items.map((row) => {
              const meta = titleById.get(row.scopeId);
              return (
                <li
                  key={row.id}
                  className="rounded-2xl border border-outline-variant bg-surface-0 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-semibold text-ink-900">
                        {meta?.title ?? row.scopeId}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {row.payerName || row.payerEmail} · {row.trxId} · last-4{" "}
                        {row.senderLast4}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="font-display text-base font-semibold text-primary">
                        ৳{formatNumber(row.amountBdt, { locale: t.locale, maximumFractionDigits: 2 })}
                      </span>
                      <Badge tone={STATUS_TONE[row.status as PaymentStatus]} size="xs">
                        {t(`payment.status.${row.status}` as Parameters<typeof t>[0])}
                      </Badge>
                    </div>
                  </div>
                  {row.reviewNote ? (
                    <p className="mt-3 rounded-xl border border-outline-variant bg-surface-1 p-2.5 text-xs text-ink-500">
                      {row.reviewNote}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Container>
  );
}
