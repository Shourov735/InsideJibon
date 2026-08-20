"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { LOCALE_COOKIE_NAME, type Locale } from "./config";
import {
  buildTranslator,
  type PluralBaseKey,
  type TranslationKey,
  type TranslationParams,
} from "./core";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: ReturnType<typeof buildTranslator>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const [current, setCurrent] = useState<Locale>(locale);
  if (current !== locale) {
    setCurrent(locale);
  }

  const setLocale = useCallback(
    (next: Locale) => {
      setCurrent(next);
      document.cookie = `${LOCALE_COOKIE_NAME}=${next};path=/;max-age=31536000;samesite=lax`;
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ locale: current, setLocale, t: buildTranslator(current) }),
    [current, setLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

export function useTranslations(): {
  t: (key: TranslationKey, params?: TranslationParams) => string;
  tn: (key: PluralBaseKey, count: number, params?: TranslationParams) => string;
  locale: Locale;
} {
  const { t } = useLanguage();
  return { t, tn: t.tn, locale: t.locale };
}