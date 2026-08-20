import type { Locale } from "./config";
import type { PluralBaseKey, TranslationKey } from "./dictionaries";
import { getDictionary } from "./dictionaries";

export type { PluralBaseKey, TranslationKey } from "./dictionaries";

export type TranslationParams = Record<string, string | number>;

const PARAM_PATTERN = /\{(\w+)\}/g;

export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(PARAM_PATTERN, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function translate(locale: Locale, key: TranslationKey, params?: TranslationParams): string {
  const dictionary = getDictionary(locale);
  const template = dictionary[key];
  return interpolate(template, params);
}

export function pluralKey(base: PluralBaseKey, count: number): TranslationKey {
  return `${base}_${count === 1 ? "one" : "other"}` as TranslationKey;
}

export type Translator = {
  (key: TranslationKey, params?: TranslationParams): string;
  tn: (key: PluralBaseKey, count: number, params?: TranslationParams) => string;
  locale: Locale;
};

export function buildTranslator(locale: Locale): Translator {
  const t = ((key: TranslationKey, params?: TranslationParams) =>
    translate(locale, key, params)) as Translator;
  t.tn = (key: PluralBaseKey, count: number, params?: TranslationParams) =>
    translate(locale, pluralKey(key, count), { count, ...params });
  t.locale = locale;
  return t;
}