/**
 * R10 — Privacy Policy (English).
 */

export const LEGAL_VERSION = "2026-09-25.1";
export const LAST_UPDATED = "2026-09-25";

export function PrivacyPolicyEn(): React.ReactNode {
  return (
    <article className="prose prose-slate max-w-none">
      <section className="space-y-3">
        <h2>1. What we collect</h2>
        <p>We collect the minimum data needed to run the Service:</p>
        <ul>
          <li>
            <strong>Account data:</strong> name, email, role (student /
            teacher / admin / parent). Stored in Neon PostgreSQL.
          </li>
          <li>
            <strong>Learning data:</strong> courses enrolled, lesson
            progress, quiz scores, streaks, XP. Used to compute
            dashboards and the weekly leaderboard.
          </li>
          <li>
            <strong>Optional webcam recordings:</strong> only when you
            start a proctored exam and explicitly consent. Recordings
            are stored encrypted in R2 and auto-deleted after 30 days.
          </li>
          <li>
            <strong>Operational logs:</strong> request counts, error
            traces, and audit events. Retained up to 90 days.
          </li>
        </ul>
        <h2>2. How we use it</h2>
        <p>
          We use your data only to provide and improve the Service, send
          transactional emails you have not opted out of, and comply
          with legal obligations. We never sell or rent your personal
          data.
        </p>
        <h2>3. Where it lives</h2>
        <p>
          Data is stored with reputable infrastructure providers:
        </p>
        <ul>
          <li>Neon PostgreSQL — primary database.</li>
          <li>Cloudflare R2 — material files, optional webcam clips, certificates.</li>
          <li>Cloudflare Email Service — transactional email delivery.</li>
          <li>Clerk — authentication only. Clerk does not get your learning data.</li>
        </ul>
        <h2>4. Cookies and similar</h2>
        <p>
          We use a single first-party cookie (the Clerk session token)
          plus a language preference cookie. No third-party advertising
          cookies, ever.
        </p>
        <h2>5. Your rights</h2>
        <p>
          You may request a copy of your data, ask us to correct
          inaccuracies, or delete your account. Email{" "}
          <a href="mailto:support@insidejibon.com.bd">support@insidejibon.com.bd</a>{" "}
          and we will respond within 7 business days.
        </p>
        <h2>6. Children</h2>
        <p>
          Users under 18 must have a parent or guardian review this
          Privacy Policy. We do not knowingly collect more data than
          necessary to deliver the Service to a student account.
        </p>
        <h2>7. Bangladesh DPDT</h2>
        <p>
          We comply with the Digital Personal Data Protection Act
          (DPDT) of Bangladesh. Complaints can be addressed to the
          Data Protection Authority.
        </p>
        <h2>8. Changes</h2>
        <p>
          Material changes will be announced by email and in-app.
          Continued use of the Service after a change constitutes
          acceptance.
        </p>
      </section>
    </article>
  );
}
