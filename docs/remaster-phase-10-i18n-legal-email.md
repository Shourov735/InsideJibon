# Remaster Phase R10 — i18n, Legal & Email Templates

> **Phase:** R10 (can run anytime after R0). Mostly content + service wiring.
> **Theme:** Ship full Bangla + English parity across legal pages, transactional emails (sent via **Cloudflare Email Service** — free, replaces Resend/Postmark), date/number/BDT currency, and validation strings. The rest of the app continues to assume `npm run check:i18n` parity holds.
> **Cost commitment:** **$0 paid**. Email Service is free; legal pages are static MDX; legal templates are reusable React Email components.

Read `AGENTS.md`, `docs/MASTER_ROADMAP.md`, `docs/MASTER_REMASTER.md`, and [`FREE-TIER-REFERENCE.md`](./FREE-TIER-REFERENCE.md) first.

---

## 1. Objectives

1. **Legal pages** — `/legal/terms`, `/legal/privacy`, `/legal/refund`, `/legal/cookies` — bilingual MDX with version + last-updated footer.
2. **Email templates** — pluggable React templates for every transactional email:
   - Enrollment decision (accept / reject / request more info)
   - Class reminder (R3)
   - Recording ready (R3)
   - Grade posted (R6/R7)
   - Q&A reply / accepted (R4)
   - Streak repair (R5)
   - AI tutor answer (R8)
   - Payment receipt (R6)
   - Refund executed (R6)
   - Parent digest (R7)
3. **Email Service binding** — `src/lib/cloudflare/email.ts` wraps `EmailMessage` + `env.email.send()`; replaced Resend / Postmark entirely.
4. **i18n expansion** — `legal.*`, `email.*`, `validation.*`, `numbers.*`, `dates.*` namespaces fully populated.
5. **BDT currency formatter** (R1 helper extended) — `formatBDT(amount, locale)` shared everywhere money is shown.
6. **Validation strings** — zod errors localizable through a single mapping.

---

## 2. Data Model Changes

### Migration `0010_remaster_r10_i18n_legal.sql`

```sql
-- Track which version of legal docs a user has accepted (cookie alternative for compliance)
CREATE TABLE IF NOT EXISTS legal_acceptances (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,  -- nullable for guest sessions
  doc_key     TEXT NOT NULL,                                  -- 'terms','privacy','refund','cookies'
  version     TEXT NOT NULL,                                  -- semver-ish e.g. '2026-09-25.1'
  ip_hash     TEXT,                                           -- SHA-256 of cf-connecting-ip for non-PII audit
  user_agent  TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS legal_acceptances_user_doc_idx ON legal_acceptances (user_id, doc_key, version);
CREATE INDEX IF NOT EXISTS legal_acceptances_doc_version_idx ON legal_acceptances (doc_key, version);

-- Suppression list (someone who unsubscribed from a category)
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  category    TEXT NOT NULL,                                  -- 'all', 'marketing', 'live_reminder', etc.
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email, category)
);

-- Track every email sent (audit + dedupe + debugging)
CREATE TABLE IF NOT EXISTS email_send_log (
  id           BIGSERIAL PRIMARY KEY,
  to_user_id   TEXT REFERENCES users(id),
  to_email     TEXT NOT NULL,
  template     TEXT NOT NULL,
  category     TEXT NOT NULL,
  provider_id  TEXT,                                          -- Cloudflare email message id
  status       TEXT NOT NULL DEFAULT 'queued',               -- queued|sent|delivered|bounced|failed|suppressed
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at      TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  failed_at     TIMESTAMPTZ,
  failure_reason TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_send_log_user_idx ON email_send_log (to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS email_send_log_template_idx ON email_send_log (template, created_at DESC);
```

---

## 3. Service Layer

### 3.1 `src/lib/cloudflare/email.ts`
- `sendEmail({ to, category, template, data, locale })`:
  1. Check `email_unsubscribes` (or in-memory R0 KV cache).
  2. Render template (server-side React Email → HTML + text).
  3. Insert `email_send_log` row (status='queued').
  4. Call Cloudflare Email Sending binding (`env.email.send(new EmailMessage({ from, to, subject, html, text }))`).
  5. Update `email_send_log.status` to `sent` (or `failed`).
- Returns `{ id, status }`.

### 3.2 `src/emails/<template>.tsx` (React Email)
Each template exports `render({ data, locale }) => { subject, html, text }`. Examples:
- `emails/enrollment-decision.tsx`
- `emails/class-reminder.tsx`
- `emails/recording-ready.tsx`
- `emails/grade-posted.tsx`
- `emails/qa-replied.tsx`
- `emails/qa-accepted.tsx`
- `emails/streak-repair.tsx`
- `emails/ai-tutor-answer.tsx`
- `emails/payment-receipt.tsx`
- `emails/refund-executed.tsx`
- `emails/parent-digest.tsx`

A `<EmailLayout>` provides the shared header/footer with the unsubscribe link.

### 3.3 `src/services/email/render.ts`
- `renderEmail(template, data, locale)` — picks the right template file, applies i18n strings (subject + body), returns `{ subject, html, text }`.
- Locale fallback: `bn → en` only when a key is missing.

### 3.4 `src/services/email/unsubscribe.ts`
- `addUnsubscribe(email, category)` — writes to `email_unsubscribes` and bumps R0 KV cache.
- `removeUnsubscribe(email, category)`.

### 3.5 `src/services/email/dedupe.ts`
- For dedupe: every `sendEmail` call includes a `dedupe_key` like `grade_posted:<submissionId>:<gradedAt>`. Idempotent.

### 3.6 `src/services/i18n/validation.ts`
- `localizeZodError(zodError, locale)` — maps zod issue codes (`invalid_type`, `too_small`, `invalid_string`, …) into localized strings using the `validation.*` namespace.

### 3.7 `src/lib/utils/format.ts` (extends R1)
- `formatBDT(amount, locale)` — `Intl.NumberFormat(locale, { style: 'currency', currency: 'BDT' })`.
- `formatBanglaNumber(n)` — `Intl.NumberFormat('bn-BD-u-nu-beng', { useGrouping: true }).format(n)`.

---

## 4. UI/UX Changes

### 4.1 Legal pages
- MDX files at `content/legal/<doc>.{en,bn}.mdx` rendered at `/legal/<doc>`.
- Footer of each legal doc: `Last updated: 2026-09-25` + version chip.
- On signup, /sign-up surfaces a checkbox "I agree to the Terms and Privacy" — both localized; click-to-open link.
- Acceptance recorded in `legal_acceptances`.

### 4.2 Footer + nav
- Add `Legal` group to marketing footer: Terms · Privacy · Refund · Cookies.
- Add `Language` toggle (R1 component, reused).

### 4.3 In-app email preferences (`/account/emails`)
- Per-category toggles mirroring web push (R9).
- "Unsubscribe from all transactional" is disallowed (we still send receipts / grade notifications for compliance).

### 4.4 Email "from" address
- Configure `noreply@insidejibon.com.bd` via Email Routing. Inbox-side rules auto-route replies to support.

### 4.5 i18n coverage
- `npm run check:i18n` passes after every PR.
- A new `scripts/i18n-coverage.mjs` (or extension of check-i18n.mjs) reports per-namespace key count + per-template bilingual sample render.

---

## 5. Security & Performance Considerations

- **Email Service free-tier cap** — Cloudflare's free tier allows a generous send quota per Worker per day (we keep ≤ 80 sends/day; alert at 70). See FREE-TIER-REFERENCE §7.
- **Per-user rate limit** — R0 KV: max 5 distinct transactional templates / user / day to prevent flood.
- **Dedupe** — every `sendEmail` requires a `dedupe_key`; replays are no-ops (returns the previous log row).
- **PII in email content** — receipts mask the bKash reference (`payer_reference` last 4 only); grade emails don't include teacher email.
- **HTML vs text** — both rendered for clients without HTML support.
- **CSP** — no impact for emails; CSP applies only to the live app.
- **Performance** — `email_send_log` insert + send is wrapped in `ctx.waitUntil` to keep request latency low.
- **GDPR / Bangladesh DPDT** — link in every email footer to `/account/emails` for one-click category unsubscribe (except transactional/critical).
- **Audit retention** — `email_send_log` rows older than 90 days are deleted by a daily Cron.

---

## 6. i18n Keys Required (R10)

- `legal.terms.title`, `legal.terms.body` (long MDX body — not a key)
- `legal.privacy.title`, `body`
- `legal.refund.title`, `body`
- `legal.cookies.title`, `body`
- `legal.lastUpdated`, `legal.version`
- `email.common.viewInApp`, `email.common.unsubscribe`, `email.common.managePreferences`
- One `email.<template>.subject` + `email.<template>.body.*` set per template
- `validation.required`, `validation.tooShort`, `validation.tooLong`, `validation.invalidEmail`, `validation.invalidUrl`, `validation.mustMatch`, `validation.outOfRange`
- `numbers.formatBangla`, `numbers.formatBDT`
- `dates.relative.justNow`, `today`, `yesterday`, `thisWeek`, `lastWeek`
- `account.emails.title`, `preferences.title`, `category.transactional`, `category.engagement`, `category.marketing`

---

## 7. Verification Checklist

1. `npm run check:i18n` — 100% parity (target ≥ 1,800 keys per locale).
2. `npx tsc --noEmit`, `npm run lint`, `npm run build` green.
3. Every transactional event in the app actually delivers via Cloudflare Email Service:
   - Trigger enrollment decision → email arrives.
   - Trigger R3 class reminder → arrives.
   - Trigger R6 payment receipt → arrives with masked bKash reference.
   - Trigger R7 parent digest → arrives.
4. Unsubscribe link in each email works and updates `email_unsubscribes`.
5. `email_send_log` rows accumulate and 90-day Cron purges them.
6. Dedupe: replay a `grade_posted` event → only one email sent.
7. Localized zod errors appear in all forms.
8. BDT formatting tested with `৳1,200.00` (English) and `১,২০০.০০ ৳` (Bangla numeral mode toggle).
9. Free-tier alert at 70 sends/day triggers email to operator.

---

## 8. Copy-Paste Prompt

```markdown
# Phase R10 — i18n, Legal & Email Templates

Read `AGENTS.md`, `docs/MASTER_READMAP.md`, `docs/MASTER_REMASTER.md`, and `docs/FREE-TIER-REFERENCE.md` first.

## Tasks
1. Run migration `0010_remaster_r10_i18n_legal.sql`.
2. Configure Email Routing for `insidejibon.com.bd` → forward replies to support inbox.
3. Add `src/lib/cloudflare/email.ts` per §3.1.
4. Build `src/emails/<template>.tsx` for every event in §3.2.
5. Add `src/services/email/{render,unsubscribe,dedupe}.ts`.
6. Add `src/services/i18n/validation.ts` + R1 extensions for `formatBDT`, `formatBanglaNumber`.
7. Author MDX legal pages `content/legal/*.mdx` in both `en` and `bn`.
8. Add `/legal/<doc>` routes + footer + signup checkbox.
9. Add `/account/emails` preferences page.
10. Wire sendEmail into: enrollment-decision (existing), R3 reminders, R4 Q&A replies/accepted, R5 streak repair, R6 receipts/refunds, R7 parent digest, R8 tutor answer.
11. Add Cron Trigger for 90-day email log purge + 70/day send quota alert.
12. Add i18n keys per §6.
13. Run §7 verification checklist.
14. Commit + push.
```
