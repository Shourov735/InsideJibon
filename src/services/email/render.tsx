import "server-only";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DEFAULT_FROM_ADDRESS } from "@/lib/cloudflare/email";
import { TEMPLATE_STRINGS, renderTemplate, type TemplateName } from "@/emails/templates";

/**
 * R10 — Email rendering service.
 *
 * Takes a template name + i18n strings + locale and returns a fully
 * rendered email payload ready to hand to `sendRawEmail()`:
 *
 *   { from, to, subject, html, text }
 *
 * The HTML body is generated via `react-dom/server.renderToStaticMarkup`
 * (already on the lockfile — no new dep). The plain-text body is a
 * coarse conversion of the React tree (we strip tags, decode common
 * entities). For most transactional emails this is plenty; if a
 * template needs a richer text view it can override `text` per call.
 *
 * Locale fallback: bn → en. If a key is missing in bn we fall back to
 * the en string before rendering. This mirrors the i18n dictionary
 * fallback behaviour.
 */

import type { Locale } from "@/i18n/config";

export type RenderedEmail = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type RenderInput = {
  template: TemplateName;
  locale: Locale;
  to: string;
  appUrl: string;
  manageToken: string;
  ctaUrl?: string;
  ctaLabel?: string;
  subjectOverride?: string;
  textOverride?: string;
};

function pickLocalized(
  template: TemplateName,
  locale: Locale
): { category: "transactional" | "engagement" | "marketing" | "parent_digest"; t: Record<string, string>; subject: string } {
  const def = TEMPLATE_STRINGS[template];
  const localeBag = locale === "bn" ? def.bn : def.en;
  // Locale fallback: if a key is missing in bn, fall back to en.
  const t: Record<string, string> = {};
  for (const key of new Set([...Object.keys(def.en), ...Object.keys(def.bn)])) {
    t[key] = localeBag[key] ?? def.en[key] ?? key;
  }
  const subject = locale === "bn" ? def.subject.bn : def.subject.en;
  return { category: def.category, t, subject };
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>(?=)/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderEmail(input: RenderInput): RenderedEmail {
  const { category, t, subject } = pickLocalized(input.template, input.locale);
  const tree = renderTemplate(input.template, {
    locale: input.locale,
    category,
    appUrl: input.appUrl,
    manageToken: input.manageToken,
    ctaUrl: input.ctaUrl ?? "",
    ctaLabel: input.ctaLabel ?? "",
    t,
  });
  const inner = renderToStaticMarkup(tree);
  // renderToStaticMarkup strips the doctype but keeps <html>; we wrap
  // it in a minimal HTML envelope so email clients honour the lang attr.
  const html = `<!doctype html>${inner}`;
  const text = input.textOverride ?? htmlToText(inner);

  return {
    from: DEFAULT_FROM_ADDRESS,
    to: input.to,
    subject: input.subjectOverride ?? subject,
    html,
    text,
  };
}
