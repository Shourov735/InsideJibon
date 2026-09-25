/**
 * R10 — Refund Policy (English).
 */

export const LEGAL_VERSION = "2026-09-25.1";
export const LAST_UPDATED = "2026-09-25";

export function RefundPolicyEn(): React.ReactNode {
  return (
    <article className="prose prose-slate max-w-none">
      <section className="space-y-3">
        <h2>1. Eligibility</h2>
        <p>
          Refunds are available for paid course enrollments within 7
          days of payment, provided you have not progressed beyond 20%
          of the course.
        </p>
        <h2>2. How to request</h2>
        <p>
          Open <a href="/account/emails">/account/emails</a> or reply to
          the receipt email. We respond within 3 business days.
        </p>
        <h2>3. Processing</h2>
        <p>
          Approved refunds are returned to the same bKash account that
          made the payment. Funds typically arrive within 1–2 business
          days after we send the refund.
        </p>
        <h2>4. What is not refundable</h2>
        <ul>
          <li>Enrollments older than 7 days.</li>
          <li>
            Enrollments where you have completed more than 20% of the
            course content.
          </li>
          <li>
            Promotional or discounted enrollments marked
            &ldquo;non-refundable&rdquo; at the time of purchase.
          </li>
        </ul>
        <h2>5. Disputes</h2>
        <p>
          If you are unhappy with a refund decision, reply to the
          decision email and a senior reviewer will respond within 5
          business days.
        </p>
      </section>
    </article>
  );
}
