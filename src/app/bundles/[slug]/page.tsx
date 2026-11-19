import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getPublishedBundleWithCourses, getBundlePriceSummary } from "@/services/payments";
import { getTranslator } from "@/i18n/server";
import { formatBDT } from "@/lib/utils";
import {
  buildAlternates,
  buildBreadcrumbJsonLd,
  buildBundleJsonLd,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublishedBundleWithCourses(slug);
  if (!result) {
    return {
      title: "Bundle Not Found",
      robots: { index: false, follow: false },
    };
  }

  const t = await getTranslator();
  const isBn = t.locale === "bn";
  const bundle = result.bundle;
  const bundleUrl = `${SITE_URL}/bundles/${bundle.slug}`;
  const bundleTitle = `${bundle.title} | InsideJibon`;
  const bundleDescription =
    bundle.description ||
    (isBn
      ? `${bundle.title} — ইনসাইড জীবনে একাধিক কোর্সের সমন্বিত বান্ডেল প্যাকেজ।`
      : `Get ${bundle.title} bundle on InsideJibon — structured academic course bundle.`);

  return {
    title: bundle.title,
    description: bundleDescription,
    alternates: buildAlternates(`/bundles/${bundle.slug}`),
    openGraph: {
      title: bundleTitle,
      description: bundleDescription,
      url: bundleUrl,
      siteName: SITE_NAME,
      locale: isBn ? "bn_BD" : "en_US",
      alternateLocale: [isBn ? "en_US" : "bn_BD"],
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: bundle.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: bundleTitle,
      description: bundleDescription,
      images: [DEFAULT_OG_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },
  };
}

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
      <JsonLd data={buildBundleJsonLd(result.bundle, t.locale as "en" | "bn")} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: t("marketing.home"), url: "/" },
          { name: t("marketing.header.courses"), url: "/courses" },
          { name: result.bundle.title, url: `/bundles/${result.bundle.slug}` },
        ])}
      />
      {/* Breadcrumb nav */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
        <Link href="/" className="hover:text-on-surface">
          {t("marketing.home")}
        </Link>
        <span aria-hidden="true">›</span>
        <Link href="/courses" className="hover:text-on-surface">
          {t("marketing.header.courses")}
        </Link>
        <span aria-hidden="true">›</span>
        <span className="truncate text-on-surface">{result.bundle.title}</span>
      </nav>
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