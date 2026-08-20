import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getTranslator } from "@/i18n/server";

export default async function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslator();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-outline-variant bg-surface-container-lowest/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-primary"
          >
            {t("brand.name")}
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/courses"
              className="text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
            >
              {t("marketing.header.courses")}
            </Link>
            <p className="hidden text-sm text-on-surface-variant sm:block">
              {t("marketing.header.tagline")}
            </p>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-outline-variant bg-surface-container-low">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-on-surface-variant sm:flex-row sm:px-6">
          <span>{t("marketing.footer.rights", { year: new Date().getFullYear() })}</span>
          <span>{t("marketing.footer.tagline")}</span>
        </div>
      </footer>
    </div>
  );
}