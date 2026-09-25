# Remaster Phase R6 — Payments, Bundles & Enrollment Gate (bKash)

> **Phase:** R6 (after R0; assumes notifications + cache layer are in place)
> **Theme:** Sell course bundles for real money via **bKash Tokenized Payment** (the only payment provider we integrate — no SaaS fee, free account, BD market native). Manual enrollment remains as a no-network fallback.
> **Cost commitment:** **$0/month subscriptions.** bKash's transaction fee is per-txn and is paid by the *payer* (per bKash published rate); InsideJibon does not pay a monthly fee to bKash.

Read `AGENTS.md`, `docs/MASTER_ROADMAP.md`, `docs/MASTER_REMASTER.md`, and [`FREE-TIER-REFERENCE.md`](./FREE-TIER-REFERENCE.md) first.

---

## 1. Objectives

1. Stand up a `payments` domain that supports **paid course bundles** via bKash Tokenized Payment.
2. Enforce a **gate**: free courses require enrollment decision (existing flow); paid bundles require a confirmed bKash payment.
3. Implement **bundles** (`course_bundle` table): multiple courses sold together at a discount.
4. **Receipts** as PDF served from R2 (signed-URL on download).
5. **Refund workflow** via bKash's `payment.refund` API + manual approval.
6. **Webhook idempotency** using R0's `request_dedupe` table.
7. **No-network fallback**: when bKash is down, "Request access" form emails the teacher (via Cloudflare Email Service — free) for manual grant; same flow as today's enrollment-decision.
8. **Compliance:** we are not PCI-DSS; bKash tokenization handles card data (none in our system). We store only the bKash `paymentID`, `trxID`, last-4-equivalent (`payerReference` masked), amount, currency, status.

---

## 2. Data Model Changes

### Migration `0006_remaster_r6_payments.sql`

```sql
-- Course bundles
CREATE TABLE IF NOT EXISTS course_bundles (
  id              UUID PRIMARY KEY,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT NOT NULL DEFAULT '',
  price_bdt       NUMERIC(10, 2) NOT NULL,                  -- gross BDT
  compare_at_bdt  NUMERIC(10, 2),                           -- strike-through
  status          TEXT NOT NULL DEFAULT 'draft',            -- draft|published|archived
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS course_bundles_status_idx ON course_bundles (status, published_at DESC);

-- Items in a bundle
CREATE TABLE IF NOT EXISTS course_bundle_items (
  id           BIGSERIAL PRIMARY KEY,
  bundle_id    UUID NOT NULL REFERENCES course_bundles(id) ON DELETE CASCADE,
  course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  position     INTEGER NOT NULL,
  UNIQUE (bundle_id, course_id),
  UNIQUE (bundle_id, position)
);

-- Pricing for individual courses (free or paid)
ALTER TABLE courses
  ADD COLUMN price_bdt      NUMERIC(10, 2),                  -- if NULL → free; if present → standalone paid
  ADD COLUMN requires_payment BOOLEAN NOT NULL DEFAULT false;

-- Payment intents (bKash)
CREATE TABLE IF NOT EXISTS payment_intents (
  id              UUID PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  scope_kind      TEXT NOT NULL,                            -- 'bundle'|'course'
  scope_id        UUID NOT NULL,                            -- bundle_id or course_id
  amount_bdt      NUMERIC(10, 2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'BDT',
  status          TEXT NOT NULL DEFAULT 'created',          -- created|initiated|executed|failed|refunded|expired
  bkash_payment_id TEXT UNIQUE,                             -- bKash-side id
  bkash_trx_id    TEXT,                                     -- bKash trxID after execute
  payer_reference TEXT,                                     -- masked bKash reference
  intent_url      TEXT,                                     -- bKash checkout URL
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS payment_intents_user_idx ON payment_intents (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_intents_status_idx ON payment_intents (status, expires_at);

-- Receipts (one per executed intent)
CREATE TABLE IF NOT EXISTS payment_receipts (
  id              UUID PRIMARY KEY,
  intent_id       UUID NOT NULL UNIQUE REFERENCES payment_intents(id),
  user_id         TEXT NOT NULL REFERENCES users(id),
  storage_key     TEXT NOT NULL,                            -- R2 key of the PDF
  receipt_number  TEXT NOT NULL UNIQUE,                     -- IJ-2026-000001 style
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enrollments auto-created from a payment
CREATE TABLE IF NOT EXISTS payment_enrollments (
  id              BIGSERIAL PRIMARY KEY,
  intent_id       UUID NOT NULL REFERENCES payment_intents(id),
  enrollment_id   UUID NOT NULL REFERENCES enrollments(id),
  UNIQUE (intent_id, enrollment_id)
);

-- Refunds
CREATE TABLE IF NOT EXISTS payment_refunds (
  id              UUID PRIMARY KEY,
  intent_id       UUID NOT NULL REFERENCES payment_intents(id),
  amount_bdt      NUMERIC(10, 2) NOT NULL,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'requested',        -- requested|approved|executed|rejected
  approved_by     TEXT REFERENCES users(id),
  bkash_refund_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at     TIMESTAMPTZ
);
```

`request_dedupe` table (already added in R0) is reused for bKash webhook idempotency.

---

## 3. Service Layer

### 3.1 `src/services/payments/bkash-client.ts`
Thin client over bKash Tokenized Payment v1:
- `getToken()` — exchanges `app_key`+`app_secret` for a short-lived bearer token; cached in `RATE_LIMIT_KV` (free).
- `createPayment({ amount, payerReference, callbackURL })` — returns `{ paymentID, bkashURL, expiresAt }`.
- `executePayment(paymentID)` — returns `{ trxID, status }`.
- `queryPayment(paymentID)`
- `refundPayment({ paymentID, amount, reason })` — returns `{ refundID }`.

Secrets required (all set via `wrangler secret put`):
- `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_BASE_URL` (sandbox + prod URLs).
- `BKASH_WEBHOOK_SECRET` — for verifying webhook signatures if provided.

### 3.2 `src/services/payments/intents.ts`
- `createIntent({ userId, scopeKind, scopeId })` — validates price, calls bKash `createPayment`, persists `payment_intents` row with `expires_at = now() + 15min`.
- `executeIntent(intentId, userId)` — calls bKash `executePayment`, on success:
  1. Marks intent `executed`, stores `trxID`.
  2. Creates enrollment rows for each bundle item (or single course).
  3. Emits a `NOTIFICATIONS_QUEUE` job → in-app + email receipt.
  4. Renders a PDF receipt and stores it in R2 → `payment_receipts`.
  5. Writes `audit_log` row.

### 3.3 `src/services/payments/webhook.ts`
- `POST /api/webhooks/bkash` — verifies signature, dedupes by `paymentID` via `request_dedupe`, reconciles state with bKash `queryPayment`. Always returns 200 on permanent conditions (per R0 webhook discipline).

### 3.4 `src/services/payments/refunds.ts`
- `requestRefund({ intentId, userId, reason })` — student initiates.
- `approveRefund({ intentId, adminId })` — admin approves.
- `executeRefund({ intentId, adminId })` — admin clicks "Execute" → calls bKash refund API → on success updates row, emits notification, partial-revoke enrollments if configured.

### 3.5 `src/services/payments/receipt-pdf.ts`
- `@react-pdf/renderer` (free, OSS) generates a small PDF (≤1 page) with: receipt number, BDT amount, courses/bundle, payer reference (masked), date, support email.
- Uploaded to R2 via `src/lib/storage/public.ts`; download via the existing signed-URL path (R0).

### 3.6 `src/services/payments/access.ts`
- `hasAccessToCourse(userId, courseId)` — used everywhere the entitlement check matters:
  - If course is free → enrollment status check.
  - If course is paid standalone → check `payment_intents.executed` for this `userId` + `course_id`.
  - If course is part of any purchased bundle → check `payment_enrollments` join.
  - If none of the above → false (locked).

---

## 4. UI/UX Changes

### 4.1 Catalog & course detail
- Add a **price pill** on each card (`৳1,200`, `Free`, or `In a bundle`).
- On course detail: "Enroll free" if free, "Buy for ৳X" if standalone, "Get bundle ৳X" if part of a bundle.
- **Bundle landing** `/bundles/[slug]` — list items, total saving, "Buy bundle" CTA.

### 4.2 Checkout flow
Single page (`/checkout/[intentId]`):
1. Summary panel (item, BDT amount, payer email).
2. "Pay with bKash" button → opens bKash checkout in a new tab (per bKash pattern: redirect to `bkashURL`).
3. Polling page (`/checkout/[intentId]/waiting`) auto-refreshes `intent.status` every 3s via Server Action `pollIntentStatus`.
4. On `executed` → redirect to `/checkout/[intentId]/success` showing receipt download + "Go to first course" CTA.
5. On `failed`/`expired` → "Retry" CTA; previous attempt persisted for audit.
6. **Fallback** ("bKash down") — switch the CTA to "Request access" → existing enrollment-decision flow + email to teacher.

### 4.3 Admin tools
- `/admin/payments` (built from the **admin dashboard placeholder** we'll add in R1):
  - Today's revenue (sum of `executed` intents).
  - Pending refunds queue.
  - Webhook delivery log (last 100, view payload).
- `/admin/payments/[intentId]` — drill-down: full timeline, audit log, refund action.

### 4.4 Notifications
- On executed payment: in-app toast + email receipt (Cloudflare Email Service — free).
- On refund approved/executed: in-app + email.
- On payment failed: in-app.
- 24h before bundle's intro class (R3 will use this hook).

### 4.5 ⌘K integration (R1)
- "Buy a bundle…" command surfaces published bundles.
- "My payments" command jumps to `/student/payments`.

---

## 5. Security & Performance Considerations

- **All bKash endpoints require TLS; we never log the bearer token or app secret.**
- **Server actions** for `createIntent`, `executeIntent`, `pollIntentStatus` are gated by `requireUser()`. Each uses R0's `defineServerAction({ role, schema, rateLimit })` with rate-limit `5 / 60s / user`.
- **Webhook endpoint** dedupes by `paymentID` via `request_dedupe`; reads R0 `request_dedupe_expires_idx` after a week.
- **bKash secret rotation** supported via `wrangler secret put BKASH_APP_SECRET`; old secret kept for 24h grace.
- **Polling** uses Server Action, not raw fetch from client, so the bearer token stays server-side.
- **CSP** allows frames only for the bKash iframe origin (verify bKash domain at integration time). Add to `frame-src` in `next.config.ts` if needed.
- **Idempotency**: replaying the bKash `execute` is safe because we look up by `paymentID` unique constraint.
- **Performance**: bundle list query uses SELECT projection (R0); `hasAccessToCourse` uses a single denormalized view `v_user_course_access` to avoid joins on hot paths.
- **Audit log** (R0 table) records every state transition on `payment_intents`.

---

## 6. i18n Keys Required (R6)

- `payment.title`, `payment.subtitle`
- `payment.actions.buy`, `payWithBkash`, `retry`, `cancel`, `requestAccess`, `viewReceipt`
- `payment.status.created`, `initiated`, `executed`, `failed`, `refunded`, `expired`
- `payment.checkout.summary`, `amount`, `email`, `support`
- `payment.success.heading`, `success.cta.goToCourse`, `success.downloadReceipt`
- `payment.fallback.unavailable`, `fallback.requestSent`
- `payment.refund.title`, `refund.reason`, `refund.approved`, `refund.executed`, `refund.rejected`
- `payment.admin.todaysRevenue`, `pendingRefunds`, `webhookLog`
- `payment.bundle.includes`, `bundle.savings`

---

## 7. Verification Checklist

1. `npm run check:i18n`, `npx tsc --noEmit`, `npm run lint`, `npm run build` green.
2. Sandbox end-to-end:
   - Student hits `/bundles/[slug]` → "Buy" → redirected to bKash sandbox → completes with test wallet → returns to `/checkout/[id]/success` → receipt PDF generated and downloadable.
   - Bundle items auto-enrolled in the student's account.
3. Webhook replay-safe: send the same `payment.execute` event twice → only one `payment_enrollments` row created; `request_dedupe` contains the key.
4. Refund: admin approves + executes → bKash `refundPayment` returns success → intent row flipped → enrollment remains (we do not auto-revoke in R6; admin can manually revoke if needed).
5. `hasAccessToCourse` returns the right answer for: free enrolled, paid enrolled, bundle-enrolled, none.
6. CSP frame-src updated; bKash iframe loads in browser.
7. No bKash secrets appear in any client bundle (`grep` the build output).
8. Worker CPU on the checkout polling path ≤ 5 ms (R0 budget holds).
9. Failure path: when bKash returns 500, the user sees the **"Request access" fallback** and an email is queued to the teacher.
10. Free-Tier alert: in 24 hours of test traffic, Workers requests stay < 70k/day (free quota headroom).

---

## 8. Copy-Paste Prompt

```markdown
# Phase R6 — Payments, Bundles & Enrollment Gate (bKash)

Read `AGENTS.md`, `docs/MASTER_READMAP.md`, `docs/MASTER_REMASTER.md`, and `docs/FREE-TIER-REFERENCE.md` first.

## Tasks
1. Create a bKash developer account (free) and obtain `app_key`/`app_secret` for sandbox.
2. Run migration `0006_remaster_r6_payments.sql`.
3. Add secrets via `wrangler secret put`: `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_BASE_URL`, `BKASH_WEBHOOK_SECRET`.
4. Build `src/services/payments/bkash-client.ts` per §3.1.
5. Build `src/services/payments/intents.ts` per §3.2.
6. Build `src/services/payments/webhook.ts` + `src/app/api/webhooks/bkash/route.ts` per §3.3.
7. Build `src/services/payments/refunds.ts` per §3.4.
8. Build `src/services/payments/receipt-pdf.ts` per §3.5.
9. Build `src/services/payments/access.ts` and update entitlement checks in: `lessons`, `materials`, `exams`, `assignments` to call `hasAccessToCourse`.
10. Build bundle listing, course detail pricing, checkout flow, success/fallback pages per §4.
11. Build admin payments dashboard per §4.3.
12. Wire NOTIFICATIONS_QUEUE producer for receipt, refund, payment-failed events.
13. Add i18n keys per §6.
14. Run §7 verification checklist end to end on bKash sandbox.
15. Commit + push.
```
