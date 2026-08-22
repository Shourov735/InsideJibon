import Link from "next/link";
import { getTranslator } from "@/i18n/server";

export async function MarketingFooter() {
  const t = await getTranslator();
  return (
    <footer className="border-t border-outline-variant bg-surface">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary text-xs font-bold">
                IJ
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-primary">InsideJibon</span>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed max-w-sm">
              {t("footer.tagline")}
            </p>
            {/* Social Links */}
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://youtube.com/@tanvirhasanjibon5827"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-secondary hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a
                href="https://facebook.com/mdtanvirhasan.jibon"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-secondary hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">{t("footer.platform")}</h3>
            <ul className="space-y-2">
              {[
                { label: t("nav.courses"), href: "/courses" },
                { label: t("nav.instructor"), href: "#instructor" },
                { label: t("nav.signIn"), href: "/sign-in" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-secondary hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Subjects */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">{t("footer.subjects")}</h3>
            <ul className="space-y-2">
              {["পদার্থবিজ্ঞান (Physics)", "রসায়ন (Chemistry)", "জীববিজ্ঞান (Biology)", "গণিত (Mathematics)"].map((s) => (
                <li key={s}><Link href="/courses" className="text-sm text-secondary hover:text-primary transition-colors">{s}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-outline-variant pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-secondary">
            © {new Date().getFullYear()} InsideJibon. {t("footer.rights")}
          </p>
          <p className="text-xs text-secondary">
            {t("footer.madeWith")} Tanvir Hasan Jibon
          </p>
        </div>
      </div>
    </footer>
  );
}
