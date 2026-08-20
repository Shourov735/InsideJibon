import "server-only";

import { cookies } from "next/headers";

import { LOCALE_COOKIE_NAME, normalizeLocale, type Locale } from "./config";
import { buildTranslator, type Translator } from "./core";

export function getLocaleFromCookie(value: string | undefined): Locale {
  return normalizeLocale(value);
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return getLocaleFromCookie(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export async function getTranslator(): Promise<Translator> {
  return buildTranslator(await getLocale());
}