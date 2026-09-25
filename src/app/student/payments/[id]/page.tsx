import { requireUser } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import { getSubmissionById, listRefundsForSubmission, getCourseAccessBadge } from "@/services/payments";
import { getDb } from "@/db";
import { courses, courseBundles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isUuid } from "@/lib/utils";
import { StudentPaymentStatus } from "@/components/student/student-payment-status";

export const metadata = {
  title: "Payment status | InsideJibon",
};

export default async function StudentPaymentStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const t = await getTranslator();
  const { id } = await params;

  if (!isUuid(id)) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <p className="text-on-surface">{t("system.requestError")}</p>
      </main>
    );
  }

  const submission = await getSubmissionById(id);
  if (!submission || submission.userId !== user.id) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <p className="text-on-surface">{t("system.requestError")}</p>
      </main>
    );
  }

  const db = getDb();
  const refunds = await listRefundsForSubmission(submission.id);

  let scopeTitle: string | null = null;
  if (submission.scopeKind === "course") {
    const [row] = await db
      .select({ title: courses.title })
      .from(courses)
      .where(eq(courses.id, submission.scopeId))
      .limit(1);
    scopeTitle = row?.title ?? null;
  } else {
    const [row] = await db
      .select({ title: courseBundles.title })
      .from(courseBundles)
      .where(eq(courseBundles.id, submission.scopeId))
      .limit(1);
    scopeTitle = row?.title ?? null;
  }

  // Surface the user's access after approval so the success card can route
  // them to the right course / bundle.
  let hasAccess = false;
  if (submission.scopeKind === "course" && submission.status === "approved") {
    const badge = await getCourseAccessBadge(user.id, {
      id: submission.scopeId,
      requiresPayment: true,
      priceBdt: submission.amountBdt,
    } as never);
    hasAccess = badge.hasAccess;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <StudentPaymentStatus
        submission={{
          id: submission.id,
          status: submission.status as
            | "submitted"
            | "under_review"
            | "approved"
            | "rejected"
            | "expired"
            | "refunded",
          scopeKind: submission.scopeKind as "bundle" | "course",
          scopeId: submission.scopeId,
          scopeTitle,
          amountBdt: Number(submission.amountBdt),
          trxId: submission.trxId,
          senderLast4: submission.senderLast4,
          createdAt: submission.createdAt.toISOString(),
          reviewedAt: submission.reviewedAt?.toISOString() ?? null,
          reviewNote: submission.reviewNote,
          expiresAt: submission.expiresAt.toISOString(),
        }}
        refunds={refunds.map((r) => ({
          id: r.id,
          status: r.status as "requested" | "approved" | "executed" | "rejected",
          amountBdt: Number(r.amountBdt),
          reason: r.reason,
          createdAt: r.createdAt.toISOString(),
          executedAt: r.executedAt?.toISOString() ?? null,
          executionNote: r.executionNote,
        }))}
        hasAccess={hasAccess}
      />
    </main>
  );
}