import * as React from "react";

/**
 * R10 — Email Layout.
 *
 * Shared shell used by every transactional template. Inline styles
 * only (most email clients strip <style> blocks and external CSS).
 * Single accent color picked at the layout level — the brand emerald
 * for engagement / transactional emails; marketing can override.
 *
 * The footer always carries:
 *   - a one-click "Manage preferences" link to /account/emails
 *   - the localized app name + year
 *   - an unsubscribe link for the email's category
 *
 * Cost note: this template adds zero SaaS dependency — it renders
 * server-side via `react-dom/server`, which is already on the lockfile.
 */

export type EmailLayoutProps = {
  locale: "en" | "bn";
  previewText: string;
  category: "transactional" | "engagement" | "marketing" | "parent_digest";
  appName: string;
  year: number;
  children: React.ReactNode;
  unsubscribeUrl: string;
  manageUrl: string;
  accent?: string; // hex; defaults to emerald
};

const FONTS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Hind Siliguri', 'Noto Sans Bengali', Helvetica, Arial, sans-serif";

const palette = (accent = "#047857") => ({
  accent,
  text: "#0f172a",
  textMuted: "#475569",
  surface: "#ffffff",
  surfaceAlt: "#f8fafc",
  border: "#e2e8f0",
});

export function EmailLayout(props: EmailLayoutProps) {
  const c = palette(props.accent);

  return (
    <html lang={props.locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{props.previewText}</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: c.surfaceAlt,
          fontFamily: FONTS,
          color: c.text,
          fontSize: 15,
          lineHeight: 1.5,
        }}
      >
        <span
          style={{
            display: "none",
            visibility: "hidden",
            opacity: 0,
            color: "transparent",
            height: 0,
            width: 0,
          }}
        >
          {props.previewText}
        </span>
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          width="100%"
          style={{ backgroundColor: c.surfaceAlt }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "32px 16px" }}>
                <table
                  role="presentation"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  width={560}
                  style={{
                    maxWidth: "100%",
                    backgroundColor: c.surface,
                    borderRadius: 12,
                    border: `1px solid ${c.border}`,
                    overflow: "hidden",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: "20px 28px",
                          backgroundColor: c.accent,
                          color: "#ffffff",
                          fontWeight: 700,
                          fontSize: 18,
                          letterSpacing: -0.2,
                        }}
                      >
                        {props.appName}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "28px 28px 8px 28px" }}>
                        {props.children}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: "16px 28px 28px 28px",
                          color: c.textMuted,
                          fontSize: 12,
                          borderTop: `1px solid ${c.border}`,
                        }}
                      >
                        <div style={{ marginBottom: 8 }}>
                          {props.manageUrl ? (
                            <a
                              href={props.manageUrl}
                              style={{ color: c.accent, textDecoration: "underline" }}
                            >
                              {props.locale === "bn"
                                ? "নোটিফিকেশন সেটিংস"
                                : "Manage notification settings"}
                            </a>
                          ) : null}
                          {props.unsubscribeUrl ? (
                            <>
                              {" · "}
                              <a
                                href={props.unsubscribeUrl}
                                style={{ color: c.textMuted }}
                              >
                                {props.locale === "bn"
                                  ? "আনসাবস্ক্রাইব"
                                  : "Unsubscribe"}
                              </a>
                            </>
                          ) : null}
                        </div>
                        <div>
                          © {props.year} {props.appName}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function EmailButton({
  href,
  label,
  accent,
}: {
  href: string;
  label: string;
  accent?: string;
}) {
  const color = accent ?? "#047857";
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: color,
              borderRadius: 8,
              padding: "10px 18px",
            }}
          >
            <a
              href={href}
              style={{
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {label}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function EmailParagraph({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 14px 0" }}>{children}</p>;
}

export function EmailHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h1
      style={{
        margin: "0 0 12px 0",
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: -0.2,
      }}
    >
      {children}
    </h1>
  );
}

export function EmailMuted({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: "#475569", fontSize: 13 }}>{children}</span>
  );
}
