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
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-on-surface-variant sm:flex-row sm:px-6">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
            <span>{t("marketing.footer.rights", { year: new Date().getFullYear() })}</span>
            <span className="hidden sm:inline text-outline-variant">·</span>
            <span>{t("marketing.footer.tagline")}</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://youtube.com/@tanvirhasanjibon5827"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-red-600 transition-colors"
              aria-label="YouTube Channel"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span>YouTube</span>
            </a>
            <a
              href="https://facebook.com/mdtanvirhasan.jibon"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-blue-600 transition-colors"
              aria-label="Facebook Profile"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Facebook</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}