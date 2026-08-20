"use client";

import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import { useLanguage } from "@/i18n/client";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  bn: "বাং",
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-0.5 text-xs font-semibold shadow-sm" role="group" aria-label="Language">
      {SUPPORTED_LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            className={
              active
                ? "rounded-full bg-neutral-900 px-2.5 py-1 text-white"
                : "rounded-full px-2.5 py-1 text-neutral-500 hover:text-neutral-900"
            }
          >
            {LOCALE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}