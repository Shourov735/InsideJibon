import type { Locale } from "../config";
import { bn } from "./bn";
import { en, type Dictionary } from "./en";

export type { Dictionary, PluralBaseKey, TranslationKey } from "./en";

export function getDictionary(locale: Locale): Dictionary {
  return locale === "bn" ? bn : en;
}