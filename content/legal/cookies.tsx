/**
 * R10 — Cookie Policy (English).
 */

export const LEGAL_VERSION = "2026-09-25.1";
export const LAST_UPDATED = "2026-09-25";

export function CookiePolicyEn(): React.ReactNode {
  return (
    <article className="prose prose-slate max-w-none">
      <section className="space-y-3">
        <h2>1. What is a cookie</h2>
        <p>
          A cookie is a small text file your browser stores on your
          device. We use cookies sparingly and never for advertising.
        </p>
        <h2>2. Cookies we set</h2>
        <ul>
          <li>
            <strong>__session</strong> — your Clerk authentication
            token. Strictly necessary; the Service cannot function
            without it.
          </li>
          <li>
            <strong>ij_lang</strong> — your preferred language (en / bn).
            Strictly necessary so we render the correct copy.
          </li>
        </ul>
        <h2>3. Cookies we never set</h2>
        <ul>
          <li>Third-party advertising cookies (none).</li>
          <li>Cross-site analytics cookies (we use first-party only).</li>
          <li>Social media tracking pixels (none).</li>
        </ul>
        <h2>4. Your choice</h2>
        <p>
          You can block cookies in your browser settings, but blocking
          the two cookies above will break the Service.
        </p>
      </section>
    </article>
  );
}
