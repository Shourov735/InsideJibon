/**
 * Generic client/server-safe utility helpers used across the app.
 *
 * - `cn()`  → className composition (Tailwind-friendly).
 * - `isUuid()` → uuid v4 format check.
 * - `formatNumber()` → locale-aware number grouping (R1 §3).
 * - `formatBDT()` → Bangladeshi Taka currency formatter (R1 §3).
 *
 * Locale semantics:
 *   - `en` → Western digits (1,234)
 *   - `bn` → Western digits (Bangladesh uses Western numerals by default)
 *   - `bn-BD-u-nu-beng` → Bengali digits (১,২৩৪) — exposed via a separate
 *     helper for users who prefer Bengali numerals.
 *
 * Keep this file dependency-free; it must run on the edge and on Workers.
 */

import type { Locale } from "@/i18n/config";

export type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Format a number with locale-appropriate digit grouping.
 *
 * Defaults to Western digits for `en` (1,234.5) and Bengali-Western for
 * `bn` (since Bangladesh uses Western digits in commerce). Pass
 * `useBengaliDigits: true` to render Bengali numerals (১,২৩৪.৫).
 */
export function formatNumber(
  value: number,
  options: {
    locale?: Locale;
    useBengaliDigits?: boolean;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  } = {},
): string {
  const locale = options.locale ?? "en";
  const intlLocale = options.useBengaliDigits && locale === "bn" ? "bn-BD-u-nu-beng" : locale;
  return new Intl.NumberFormat(intlLocale, {
    useGrouping: true,
    maximumFractionDigits: options.maximumFractionDigits,
    minimumFractionDigits: options.minimumFractionDigits,
  }).format(value);
}

/**
 * Format a number as Bangladeshi Taka (BDT) currency.
 *
 * Uses Intl currency formatting so the symbol placement and separators
 * follow the active locale. Decimal digits are dropped for whole
 * amounts to avoid the noisy `৳1,200.00` style — pass `showDecimals`
 * to override.
 */
export function formatBDT(
  amount: number,
  options: {
    locale?: Locale;
    useBengaliDigits?: boolean;
    showDecimals?: boolean;
  } = {},
): string {
  const locale = options.locale ?? "en";
  const intlLocale = options.useBengaliDigits && locale === "bn" ? "bn-BD-u-nu-beng" : locale;
  const fractionDigits = options.showDecimals ? 2 : amount % 1 === 0 ? 0 : 2;
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(amount);
}
