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
  if (!isDocKey(doc)) return { title: "Not found" };
  const locale = await getLocale();
  const t = buildTranslator(locale);
  return {
    title: `${t(docTitleKey(doc))} — InsideJibon`,
    description: t(docTitleKey(doc)),
    robots: { index: true, follow: true },
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
  const t = buildTranslator(locale);
  const content = getLegalDoc(doc, locale);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
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
