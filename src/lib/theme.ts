/**
 * R1 §2 + §3 — theme handling.
 *
 * A tiny cookie-backed theme system that lives outside React so it can
 * be read on the server (layout reads the cookie) and on the client
 * (toggle persists).
 *
 * Cookie name: `ij_theme`. Value: `light` | `dark` | `system`.
 * The `<html>` element gets `data-theme="light" | "dark"` injected
 * from the cookie; if absent we honor `prefers-color-scheme` first
 * paint (the tokens.css media query handles that) and then lock to
 * the user's choice on first interaction.
 */

import "server-only";
import { cookies } from "next/headers";

export const THEME_COOKIE_NAME = "ij_theme";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

const VALID: ReadonlyArray<ThemePreference> = ["light", "dark", "system"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (VALID as readonly string[]).includes(value);
}

export function normalizeThemePreference(value: string | undefined | null): ThemePreference {
  if (!value) return DEFAULT_THEME_PREFERENCE;
  return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
}

/**
 * Resolve the *effective* theme (light/dark) given the user's stored
 * preference. When `system`, we cannot know from the server alone —
 * the choice is made client-side on first paint via the OS query. In
 * SSR we return `null` so the caller can omit `data-theme` and let the
 * CSS media query take over.
 */
export function resolveThemeFromPreference(pref: ThemePreference): Theme | null {
  if (pref === "system") return null;
  return pref;
}

/**
 * Async wrapper around `cookies()` — must be called from a request
 * scope. Returns the stored preference (or the default).
 */
export async function getStoredThemePreference(): Promise<ThemePreference> {
  const store = await cookies();
  return normalizeThemePreference(store.get(THEME_COOKIE_NAME)?.value);
}
