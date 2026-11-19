import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getLocale } from "@/i18n/server";
import { buildTranslator } from "@/i18n/core";
import { getLegalDoc, LEGAL_DOCS, LEGAL_LAST_UPDATED, type LegalDocKey } from "@/content/legal";

/**
 * R10 — `/legal/[doc]` route.
 *
 * Renders one of four legal documents (terms / privacy / refund /
 * cookies) in the active locale, with a footer showing the version
 * chip + last-updated date. The page is fully static-able — content is
 * baked into the bundle at build time and the route handler sets a
 * long edge-cache lifetime (see `revalidate`).
 *
 * Unknown `doc` values return 404 so an attacker cannot enumerate.
 */

import {
  buildAlternates,
  buildBreadcrumbJsonLd,
  buildLegalJsonLd,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";

const DOC_KEYS: LegalDocKey[] = ["terms", "privacy", "refund", "cookies"];

function isDocKey(value: string): value is LegalDocKey {
  return (DOC_KEYS as string[]).includes(value);
}

function docTitleKey(doc: LegalDocKey) {
  // Hand-coded to keep `TranslationKey` strictly typed.
  switch (doc) {
    case "terms":
      return "legal.termsTitle" as const;
    case "privacy":
      return "legal.privacyTitle" as const;
    case "refund":
      return "legal.refundTitle" as const;
    case "cookies":
      return "legal.cookiesTitle" as const;
  }
}

function getDocDescription(doc: LegalDocKey, isBn: boolean): string {
  switch (doc) {
    case "terms":
      return isBn
        ? "ইনসাইড জীবন প্ল্যাটফর্ম ব্যবহারের নিয়মাবলী, শর্ত ও নীতিমালা সম্পর্কে বিস্তারিত জানুন।"
        : "Read the Terms of Service governing the use of InsideJibon academic learning platform.";
    case "privacy":
      return isBn
        ? "ইনসাইড জীবনে আপনার ব্যক্তিগত তথ্য কীভাবে সুরক্ষিত ও সংরক্ষিত রাখা হয় তার গোপনীয়তা নীতি।"
        : "Learn how InsideJibon protects and handles your personal data and privacy.";
    case "refund":
      return isBn
        ? "ইনসাইড জীবনের কোর্স ও সেবার ফি প্রদান এবং রিফান্ড সংক্রান্ত স্পষ্ট নীতিমালা।"
        : "Understand InsideJibon's refund policy, payment terms, and course access conditions.";
    case "cookies":
      return isBn
        ? "ইনসাইড জীবনে ব্রাউজিং অভিজ্ঞতা ও সেশন সুরক্ষায় ব্যবহৃত কুকি সংক্রান্ত তথ্য।"
        : "Information about how cookies and session storage are used on InsideJibon.";
  }
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return DOC_KEYS.map((doc) => ({ doc }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc } = await params;
  if (!isDocKey(doc)) return { title: "Not found", robots: { index: false, follow: false } };
  const locale = await getLocale();
  const isBn = locale === "bn";
  const t = buildTranslator(locale);
  const docTitle = `${t(docTitleKey(doc))} | InsideJibon`;
  const description = getDocDescription(doc, isBn);
  const docUrl = `${SITE_URL}/legal/${doc}`;

  return {
    title: { absolute: docTitle },
    description,
    alternates: buildAlternates(`/legal/${doc}`),
    openGraph: {
      title: docTitle,
      description,
      url: docUrl,
      siteName: SITE_NAME,
      locale: isBn ? "bn_BD" : "en_US",
      alternateLocale: [isBn ? "en_US" : "bn_BD"],
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: docTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: docTitle,
      description,
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

export default async function LegalDocPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  if (!isDocKey(doc)) notFound();
  const locale = await getLocale();
  const isBn = locale === "bn";
  const t = buildTranslator(locale);
  const content = getLegalDoc(doc, locale);
  const docTitle = t(docTitleKey(doc));
  const description = getDocDescription(doc, isBn);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      <JsonLd
        data={buildLegalJsonLd(doc, docTitle, LEGAL_LAST_UPDATED[doc], description)}
      />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: isBn ? "হোম" : "Home", url: "/" },
          { name: docTitle, url: `/legal/${doc}` },
        ])}
      />
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
        <Link href="/" className="hover:text-on-surface">
          {isBn ? "হোম" : "Home"}
        </Link>
        <span aria-hidden="true">›</span>
        <span className="truncate text-on-surface">{docTitle}</span>
      </nav>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-on-surface-variant">
          {t("legal.footerLink")}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-on-surface">
          {t(docTitleKey(doc))}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
          <span>
            {t("legal.lastUpdated")}: {LEGAL_LAST_UPDATED[doc]}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {t("legal.version", { version: LEGAL_DOCS[doc] })}
          </span>
        </div>
      </header>
      <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm">
        {content}
      </div>
      <p className="mt-6 text-xs text-on-surface-variant">
        <Link className="underline hover:text-primary" href="/legal/terms">
          {t("legal.footerTerms")}
        </Link>
        {" · "}
        <Link className="underline hover:text-primary" href="/legal/privacy">
          {t("legal.footerPrivacy")}
        </Link>
        {" · "}
        <Link className="underline hover:text-primary" href="/legal/refund">
          {t("legal.footerRefund")}
        </Link>
        {" · "}
        <Link className="underline hover:text-primary" href="/legal/cookies">
          {t("legal.footerCookies")}
        </Link>
      </p>
    </div>
  );
}
