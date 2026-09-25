import { requireTeacher } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import { listTeacherQueue } from "@/services/payments";
import { getDb } from "@/db";
import { courses } from "@/db/schema";
import { inArray } from "drizzle-orm";

export const metadata = {
  title: "Course payments | InsideJibon",
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
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {t("payment.teacher.queue")}
        </h1>
        <p className="text-sm text-on-surface-variant">
          {t("payment.subtitle")}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-10 text-center text-sm text-on-surface-variant">
          {t("payment.admin.empty")}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((row) => {
            const meta = titleById.get(row.scopeId);
            return (
              <li
                key={row.id}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-on-surface">
                      {meta?.title ?? row.scopeId}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {row.payerName || row.payerEmail} ·{" "}
                      {row.trxId} · last-4 {row.senderLast4}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-primary">
                      ৳{row.amountBdt.toFixed(2)}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {t(`payment.status.${row.status}` as Parameters<typeof t>[0])}
                    </span>
                  </div>
                </div>
                {row.reviewNote && (
                  <p className="mt-2 rounded-md border border-outline-variant bg-surface p-2 text-xs text-on-surface-variant">
                    {row.reviewNote}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}