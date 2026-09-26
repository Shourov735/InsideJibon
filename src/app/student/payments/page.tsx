import Link from "next/link";
import { requireUser } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import { listStudentSubmissions } from "@/services/payments";
import { getDb } from "@/db";
import { courses, courseBundles } from "@/db/schema";
import { inArray } from "drizzle-orm";

export const metadata = {
  title: "My payments | InsideJibon",
};

export default async function StudentPaymentsPage() {
  const user = await requireUser();
  const t = await getTranslator();
  const submissions = await listStudentSubmissions(user.id);

  const courseIds = Array.from(
    new Set(
      submissions
        .filter((s) => s.scopeKind === "course")
        .map((s) => s.scopeId)
    )
  );
  const bundleIds = Array.from(
    new Set(
      submissions
        .filter((s) => s.scopeKind === "bundle")
        .map((s) => s.scopeId)
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
      ? db
          .select({ id: courseBundles.id, title: courseBundles.title, slug: courseBundles.slug })
          .from(courseBundles)
          .where(inArray(courseBundles.id, bundleIds))
      : Promise.resolve([] as Array<{ id: string; title: string; slug: string }>),
  ]);

  const titleByScope = new Map<string, { title: string; slug: string | null }>();
  for (const row of courseRows) titleByScope.set(`course:${row.id}`, { title: row.title, slug: row.slug });
  for (const row of bundleRows) titleByScope.set(`bundle:${row.id}`, { title: row.title, slug: row.slug });

  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {t("payment.title")}
        </h1>
        <p className="text-sm text-on-surface-variant">
          {t("payment.subtitle")}
        </p>
      </header>

      {submissions.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-10 text-center text-sm text-on-surface-variant">
          {t("payment.admin.empty")}
        </div>
      ) : (
        <ul className="space-y-3">
          {submissions.map((row) => {
            const meta = titleByScope.get(`${row.scopeKind}:${row.scopeId}`);
            return (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs"
              >
                <div className="space-y-1">
                  <Link
                    href={`/student/payments/${row.id}`}
                    className="font-semibold text-on-surface hover:underline"
                  >
                    {meta?.title ?? row.scopeId}
                  </Link>
                  <p className="text-xs text-on-surface-variant">
                    {new Date(row.createdAt).toLocaleString()}
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
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}