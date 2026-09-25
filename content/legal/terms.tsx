/**
 * R10 — Legal content (Terms of Service, English).
 *
 * Each legal doc is a server-rendered React tree that ships with the
 * app bundle. Keeping the content in TSX rather than MDX avoids the
 * `@next/mdx` dep (which would otherwise be added), keeps the legal
 * copy under git review, and lets us localize via the i18n dictionary
 * for headings while still hand-authoring the body text where the
 * legal language needs precise wording.
 *
 * The footer of every page carries `legal.lastUpdated` + `legal.version`
 * keys from the i18n dictionary so the operator can push a version
 * bump without touching the body text.
 */

export const LEGAL_VERSION = "2026-09-25.1";
export const LAST_UPDATED = "2026-09-25";

export function TermsOfServiceEn(): React.ReactNode {
  return (
    <article className="prose prose-slate max-w-none">
      <section className="space-y-3">
        <h2>1. Acceptance</h2>
        <p>
          By creating an account or using InsideJibon (the
          &ldquo;Service&rdquo;), you agree to these Terms. If you do not
          agree, do not use the Service.
        </p>
        <h2>2. Eligibility</h2>
        <p>
          The Service is intended for students aged 13 and above. Users
          under 18 must have a parent or legal guardian review these
          Terms and the Privacy Policy on their behalf.
        </p>
        <h2>3. Account responsibilities</h2>
        <p>
          You are responsible for keeping your login credentials secure
          and for activity that occurs under your account. Notify us
          promptly of any unauthorized use.
        </p>
        <h2>4. Course access</h2>
        <p>
          Course enrollment may be free or paid (via bKash). Paid
          enrollments are governed by the Refund Policy. Free
          enrollments can be revoked by a teacher or admin if the
          course is archived or if you breach these Terms.
        </p>
        <h2>5. Content ownership</h2>
        <p>
          Lessons, materials, and quizzes are owned by their respective
          teachers or by InsideJibon. You may view them for personal
          learning; redistribution or republication requires written
          permission.
        </p>
        <h2>6. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Upload malicious content or attempt to disrupt the Service.</li>
          <li>Impersonate another student, teacher, or admin.</li>
          <li>
            Use the Service to harass, defame, or discriminate against
            any person.
          </li>
          <li>
            Circumvent exam proctoring, attempt to cheat, or share
            answers in a way that undermines the assessment.
          </li>
        </ul>
        <h2>7. Termination</h2>
        <p>
          We may suspend or terminate your account for breach of these
          Terms. You may close your account at any time from the
          settings page.
        </p>
        <h2>8. Disclaimers</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties
          of any kind. We do our best to keep it available and
          accurate, but we cannot guarantee uninterrupted or error-free
          operation.
        </p>
        <h2>9. Changes</h2>
        <p>
          We may update these Terms from time to time. Material changes
          will be announced by email and in-app. Continued use of the
          Service after a change constitutes acceptance.
        </p>
        <h2>10. Contact</h2>
        <p>
          For questions about these Terms, reply to any InsideJibon
          email or write to <a href="mailto:support@insidejibon.com.bd">support@insidejibon.com.bd</a>.
        </p>
      </section>
    </article>
  );
}
