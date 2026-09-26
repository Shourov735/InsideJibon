import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublishedBundleWithCourses, getBundlePriceSummary } from "@/services/payments";
import { getTranslator } from "@/i18n/server";
import { formatBDT } from "@/lib/utils";

export const metadata = {
  title: "Bundle | InsideJibon",
};

export default async function BundleLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublishedBundleWithCourses(slug);
  if (!result) notFound();

  const t = await getTranslator();
  const summary = await getBundlePriceSummary(result.bundle.id);
  const itemCount = result.items.length;

  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8 space-y-6">
      <header className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xs">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {result.bundle.title}
        </h1>
        {result.bundle.description && (
          <p className="mt-2 text-sm text-on-surface-variant">
            {result.bundle.description}
          </p>
        )}
        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-3xl font-bold text-primary">
            {formatBDT(Number(result.bundle.priceBdt))}
          </span>
          {summary && summary.coursesTotalBdt > Number(result.bundle.priceBdt) && (
            <span className="text-sm text-on-surface-variant line-through">
              {formatBDT(summary.coursesTotalBdt)}
            </span>
          )}
        </div>
        <Link
          href={`/checkout/bundle/${result.bundle.id}`}
          className="mt-5 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90"
        >
          {t("payment.actions.payManually")} →
        </Link>
      </header>

      <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
        <h2 className="text-base font-semibold text-on-surface">
          {t("payment.bundle.includes")}
        </h2>
        <p className="text-xs text-on-surface-variant">
          {t.tn("payment.bundle.courses", itemCount)}
        </p>
        <ul className="mt-3 space-y-2">
          {result.items.map((item) => (
            <li
              key={item.courseId}
              className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface p-3"
            >
              <Link
                href={`/courses/${item.slug}`}
                className="font-medium text-on-surface hover:underline"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}