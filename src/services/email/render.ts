import "server-only";

import { DEFAULT_FROM_ADDRESS } from "@/lib/cloudflare/email";
import { TEMPLATE_STRINGS, type TemplateName } from "@/emails/templates";

import type { Locale } from "@/i18n/config";

/**
 * R10 — Email rendering service.
 *
 * Server-renders an HTML + plain-text email body for one of the 11
 * transactional templates. Templates are **string-based** rather than
 * React-rendered, because Next 16's Turbopack rule blocks
 * `react-dom/server` imports from anything routed through a Server
 * Component (the dispatcher runs inside service code which can be
 * imported into Server Components). A tiny, dependency-free template
 * engine keeps the same escape story, locale fallback, and
 * per-template copy that an email client needs — without taking on
 * `react-dom/server` or a new dep.
 *
 * Layout:
 *
 *   <!doctype html>
 *   <html lang="{locale}">
 *     <head><title>{preview}</title></head>
 *     <body>
 *       <span style="display:none">{preview}</span>
 *       <table role="presentation" width="100%">
 *         <tr><td align="center">
 *           <table width="560">
 *             <tr><td>{header}</td></tr>
 *             <tr><td>{body + cta}</td></tr>
 *             <tr><td>{footer}</td></tr>
 *           </table>
 *         </td></tr>
 *       </table>
 *     </body>
 *   </html>
 *
 * All values are HTML-escaped before substitution.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

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
): {
  category: "transactional" | "engagement" | "marketing" | "parent_digest";
  t: Record<string, string>;
  subject: string;
} {
  const def = TEMPLATE_STRINGS[template];
  const localeBag = locale === "bn" ? def.bn : def.en;
  const t: Record<string, string> = {};
  for (const key of new Set([...Object.keys(def.en), ...Object.keys(def.bn)])) {
    t[key] = localeBag[key] ?? def.en[key] ?? key;
  }
  const subject = locale === "bn" ? def.subject.bn : def.subject.en;
  return { category: def.category, t, subject };
}

function renderHtml(input: {
  locale: Locale;
  category: RenderedCategory;
  appName: string;
  year: number;
  preview: string;
  title: string;
  intro: string;
  outro: string;
  ctaUrl: string;
  ctaLabel: string;
  manageUrl: string;
  unsubscribeUrl: string;
}): string {
  const accent = input.category === "transactional" ? "#0f172a" : "#047857";
  const ctaButton = input.ctaUrl
    ? `<p style="margin:0 0 14px 0;">
        <a href="${escapeAttr(input.ctaUrl)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;border-radius:8px;padding:10px 18px;">
          ${escapeHtml(input.ctaLabel || (input.locale === "bn" ? "দেখুন" : "View"))}
        </a>
      </p>`
    : "";
  const outro = input.outro
    ? `<p style="margin:0 0 14px 0;color:#475569;font-size:13px;">${escapeHtml(input.outro)}</p>`
    : "";
  const unsubscribe = input.unsubscribeUrl
    ? ` · <a href="${escapeAttr(input.unsubscribeUrl)}" style="color:#475569;">${
        input.locale === "bn" ? "আনসাবস্ক্রাইব" : "Unsubscribe"
      }</a>`
    : "";
  return `<!doctype html>
<html lang="${input.locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(input.preview)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Hind Siliguri','Noto Sans Bengali',Helvetica,Arial,sans-serif;color:#0f172a;font-size:15px;line-height:1.5;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(input.preview)}</span>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;">
      <tbody>
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:100%;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
              <tbody>
                <tr>
                  <td style="padding:20px 28px;background-color:${accent};color:#ffffff;font-weight:700;font-size:18px;letter-spacing:-0.2px;">
                    ${escapeHtml(input.appName)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 28px 8px 28px;">
                    <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;letter-spacing:-0.2px;">${escapeHtml(input.title)}</h1>
                    ${input.intro ? `<p style="margin:0 0 14px 0;">${escapeHtml(input.intro)}</p>` : ""}
                    ${ctaButton}
                    ${outro}
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 28px 28px 28px;color:#475569;font-size:12px;border-top:1px solid #e2e8f0;">
                    <div style="margin-bottom:8px;">
                      <a href="${escapeAttr(input.manageUrl)}" style="color:${accent};text-decoration:underline;">
                        ${input.locale === "bn" ? "নোটিফিকেশন সেটিংস" : "Manage notification settings"}
                      </a>${unsubscribe}
                    </div>
                    <div>© ${input.year} ${escapeHtml(input.appName)}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
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

type RenderedCategory =
  | "transactional"
  | "engagement"
  | "marketing"
  | "parent_digest";

function unsubscribeable(category: RenderedCategory): boolean {
  return category !== "transactional";
}

export function renderEmail(input: RenderInput): RenderedEmail {
  const { category, t, subject } = pickLocalized(input.template, input.locale);
  const manageUrl = `${input.appUrl}/account/emails?token=${encodeURIComponent(input.manageToken)}`;
  const unsubscribeUrl = unsubscribeable(category)
    ? `${input.appUrl}/account/emails/unsubscribe?token=${encodeURIComponent(input.manageToken)}&category=${category}`
    : "";
  const html = renderHtml({
    locale: input.locale,
    category,
    appName: "InsideJibon",
    year: new Date().getUTCFullYear(),
    preview: t["preview"] ?? t["title"] ?? "",
    title: t["title"] ?? "",
    intro: t["intro"] ?? "",
    outro: t["outro"] ?? "",
    ctaUrl: input.ctaUrl ?? "",
    ctaLabel: input.ctaLabel ?? "",
    manageUrl,
    unsubscribeUrl,
  });
  const text = input.textOverride ?? htmlToText(html);

  return {
    from: DEFAULT_FROM_ADDRESS,
    to: input.to,
    subject: input.subjectOverride ?? subject,
    html,
    text,
  };
}
