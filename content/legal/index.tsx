/**
 * R10 — Legal content registry.
 *
 * One import surface for the `/legal/*` routes. Each doc exports its
 * `LEGAL_VERSION` and `LAST_UPDATED` constants so the route footer can
 * render the version chip without hard-coding.
 */

import { LEGAL_VERSION as TERMS_VERSION, LAST_UPDATED as TERMS_UPDATED, TermsOfServiceEn } from "./terms";
import { LEGAL_VERSION as TERMS_BN_VERSION, LAST_UPDATED as TERMS_BN_UPDATED, TermsOfServiceBn } from "./terms.bn";
import { LEGAL_VERSION as PRIVACY_VERSION, LAST_UPDATED as PRIVACY_UPDATED, PrivacyPolicyEn } from "./privacy";
import { LEGAL_VERSION as PRIVACY_BN_VERSION, LAST_UPDATED as PRIVACY_BN_UPDATED, PrivacyPolicyBn } from "./privacy.bn";
import { LEGAL_VERSION as REFUND_VERSION, LAST_UPDATED as REFUND_UPDATED, RefundPolicyEn } from "./refund";
import { LEGAL_VERSION as REFUND_BN_VERSION, LAST_UPDATED as REFUND_BN_UPDATED, RefundPolicyBn } from "./refund.bn";
import { LEGAL_VERSION as COOKIES_VERSION, LAST_UPDATED as COOKIES_UPDATED, CookiePolicyEn } from "./cookies";
import { LEGAL_VERSION as COOKIES_BN_VERSION, LAST_UPDATED as COOKIES_BN_UPDATED, CookiePolicyBn } from "./cookies.bn";

import type { Locale } from "@/i18n/config";

export type LegalDocKey = "terms" | "privacy" | "refund" | "cookies";

export const LEGAL_DOCS: Record<LegalDocKey, string> = {
  terms: "2026-09-25.1",
  privacy: "2026-09-25.1",
  refund: "2026-09-25.1",
  cookies: "2026-09-25.1",
};

export const LEGAL_LAST_UPDATED: Record<LegalDocKey, string> = {
  terms: "2026-09-25",
  privacy: "2026-09-25",
  refund: "2026-09-25",
  cookies: "2026-09-25",
};

export function getLegalDoc(key: LegalDocKey, locale: Locale): React.ReactNode {
  if (locale === "bn") {
    switch (key) {
      case "terms":
        return <TermsOfServiceBn />;
      case "privacy":
        return <PrivacyPolicyBn />;
      case "refund":
        return <RefundPolicyBn />;
      case "cookies":
        return <CookiePolicyBn />;
    }
  }
  switch (key) {
    case "terms":
      return <TermsOfServiceEn />;
    case "privacy":
      return <PrivacyPolicyEn />;
    case "refund":
      return <RefundPolicyEn />;
    case "cookies":
      return <CookiePolicyEn />;
  }
}

// Re-export for callers that want to inspect the en/bn version strings
// individually (mostly for diagnostics).
export const EN_VERSIONS = {
  terms: TERMS_VERSION,
  privacy: PRIVACY_VERSION,
  refund: REFUND_VERSION,
  cookies: COOKIES_VERSION,
};

export const BN_VERSIONS = {
  terms: TERMS_BN_VERSION,
  privacy: PRIVACY_BN_VERSION,
  refund: REFUND_BN_VERSION,
  cookies: COOKIES_BN_VERSION,
};

export const EN_UPDATED = {
  terms: TERMS_UPDATED,
  privacy: PRIVACY_UPDATED,
  refund: REFUND_UPDATED,
  cookies: COOKIES_UPDATED,
};

export const BN_UPDATED = {
  terms: TERMS_BN_UPDATED,
  privacy: PRIVACY_BN_UPDATED,
  refund: REFUND_BN_UPDATED,
  cookies: COOKIES_BN_UPDATED,
};
