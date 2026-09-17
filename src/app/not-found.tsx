import Link from "next/link";
import type { Metadata } from "next";
import { getTranslator } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Page Not Found | InsideJibon",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function NotFound() {
  const t = await getTranslator();

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="bento-card flex max-w-md flex-col items-center p-8 sm:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <span className="font-mono text-2xl font-bold">404</span>
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {t("seo.notfound.heading")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-secondary sm:text-base">
          {t("seo.notfound.desc")}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full">
          <Link
            href="/"
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
          >
            {t("seo.notfound.backHome")}
          </Link>
          <Link
            href="/courses"
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
          >
            {t("seo.notfound.browseCourses")}
          </Link>
        </div>
      </div>
    </main>
  );
}
