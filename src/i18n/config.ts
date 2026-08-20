export const SUPPORTED_LOCALES = ["en", "bn"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE_NAME = "ij_lang";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | undefined | null): Locale {
  if (!value) return DEFAULT_LOCALE;
  if (isLocale(value)) return value;
  if (value.toLowerCase().startsWith("bn")) return "bn";
  return DEFAULT_LOCALE;
}