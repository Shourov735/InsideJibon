# Remaster Phase R0 — Foundation Refactor & Hardening

> **Phase:** R0 (blocks R1, R2, R3, R6)
> **Theme:** Tech debt, security, performance, edge scaffolding — *no* new features.
> **Why first:** every later phase assumes the components are split, secrets are guarded, queries are projected, and the edge cache layer is in place.

Read `AGENTS.md`, `docs/MASTER_ROADMAP.md`, `docs/MASTER_REMASTER.md`, and [`FREE-TIER-REFERENCE.md`](./FREE-TIER-REFERENCE.md) first. **Cost commitment:** this phase stays on Workers Free plan (CPU ≤ 10ms/invocation), R2 free egress, KV free quotas, Neon free tier, Clerk free tier.

---

## 1. Objectives

1. Split the 5 mega-components (>500 lines) into focused 100–200 line pieces governed by three reusable shells.
2. Replace every `SELECT *` with a Drizzle `.select({ ...fields })` projection.
3. Add the missing database indexes identified in the audit.
4. Add security headers (CSP, HSTS) and end-to-end rate limiting via Workers KV.
5. Set up the infra bindings we'll need across the rest of the remaster: KV namespaces, Queues, R2 custom public bucket, Cache API helpers.
6. Switch R2 streaming downloads to **short-lived signed redirect URLs** for large assets (videos, PDFs >5MB).
7. Establish a request-context helper: `getRequestContext()` providing `cf-ray`, `ip`, `country` to services (used by rate limits, proctoring, and IP-based analytics).

---

## 2. Data Model Changes

### Migration `0001_remaster_r0_indexes_and_infra.sql`

```sql
-- Indexes that don't exist today; all tuned for Neon HTTP / small-row reads
CREATE INDEX IF NOT EXISTS notifications_user_created_desc_idx
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lesson_comments_lesson_created_desc_idx
  ON lesson_comments (lesson_id, created_at DESC);
CREATE INDEX IF NOT EXISTS enrollments_student_status_idx
  ON enrollments (student_id, status);
CREATE INDEX IF NOT EXISTS enrollments_decided_by_idx
  ON enrollments (decided_by);
CREATE INDEX IF NOT EXISTS exam_attempts_submitted_at_idx
  ON exam_attempts (submitted_at DESC);
CREATE INDEX IF NOT EXISTS courses_status_published_idx
  ON courses (status, published_at DESC);
CREATE INDEX IF NOT EXISTS assignment_submissions_assignment_status_idx
  ON assignment_submissions (assignment_id, status);
CREATE INDEX IF NOT EXISTS class_sessions_status_scheduled_idx
  ON class_sessions (status, scheduled_at);
CREATE INDEX IF NOT EXISTS materials_lesson_created_idx
  ON materials (lesson_id, created_at);
CREATE INDEX IF NOT EXISTS assignment_submission_files_filename_idx
  ON assignment_submission_files (original_filename);

-- Idempotency / dedupe table — reusable for webhooks (clerk, bkash), CSV exports, AI tutor
CREATE TABLE IF NOT EXISTS request_dedupe (
  key TEXT PRIMARY KEY,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS request_dedupe_expires_idx ON request_dedupe (expires_at);
```

### New tiny tables (no schema-bloat)

```sql
-- Audit log for high-trust actions (role change, publish, payment grant)
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    TEXT REFERENCES users(id),
  action      TEXT NOT NULL,            -- e.g. 'role.change', 'exam.publish', 'enrollment.grant'
  subject_id  TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_actor_created_idx ON audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_created_idx ON audit_log (action, created_at DESC);

-- Generic feature-flag table (also exposed via KV mirror for hot reads)
CREATE TABLE IF NOT EXISTS feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Document these in `src/db/schema/audit.ts` and `src/db/schema/feature-flags.ts`.

---

## 3. Service Layer Changes

### 3.1 New infra modules

- `src/lib/cloudflare/cache.ts` — `cacheKey()`, `edgeCache(request, fetcher, opts)` helpers using the **Cache API** with `Cloudflare-Cache-Tag` for tag-based purge from actions.
- `src/lib/cloudflare/kv.ts` — typed accessor for `RATE_LIMIT_KV`, `SESSION_KV`, `FEATURE_FLAGS_KV` namespaces; degrades to in-memory fallback in Node dev.
- `src/lib/cloudflare/queues.ts` — `enqueue('notifications.fanout', payload)` typed producer.
- `src/lib/cloudflare/r2.ts` — typed wrapper over `MATERIALS_BUCKET` + a new `PUBLIC_BUCKET` for cacheable assets (course thumbnails, og images). Exports `signGetUrl(key, ttl)` for protected assets; `publicUrl(key)` for public.
- `src/lib/request-context.ts` — pulls `cf-ray`, `cf-ipcountry`, `cf-connecting-ip` into a per-request `RequestContext`; cached at request scope via `cache()`.

### 3.2 Reusable shells (introduce, do not mass-rewrite yet — just create + apply in R1)

Add under `src/components/shared/resource/`:
- `resource-directory.tsx` — list-with-search-filter-tabs server component, takes `query`, `filtersSchema`, `columns`, `emptyState`, `actions`. Used by every teacher list and future admin lists.
- `resource-form-shell.tsx` — client wrapper for a create/edit form with: optimistic submit, error banner, dirty-state guard, focus trap on submit-error, keyboard escape.
- `resource-detail-shell.tsx` — server wrapper with header + tabs (using `searchParams.tab`) + right-rail actions + breadcrumb.

These three will save ~2k lines when the split in §4 happens.

### 3.3 Server action contract change

- Every server action returns `{ ok: true, data } | { ok: false, error: { code, messageKey, params } }` instead of throwing. Components `useActionState` it. (This unblocks R1 skeletons and R9 proctoring UX.)
- A `defineServerAction({ role, schema, rateLimit })` helper enforces: requireRole, zod parse, rate-limit (KV bucket), audit log on success.

### 3.4 Service-layer DB projections

Walk through every file in `src/services/**/*.ts` and ensure every `.from(table).where(...)` has an explicit `.select({ ... })`. Targets (non-exhaustive):

- `services/exams/attempts.ts` — stop selecting `contentSnapshot` for status checks; split into `getAttemptStatus(id)` (cheap) and `getAttemptForGrading(id)` (full).
- `services/courses/courses.ts` — listing endpoints should not select `lessons`, `materials`, `exam_count` columns; let the directory own the join.
- `services/notifications/notifications.ts` — inbox query projects only the columns shown in the bell badge + dropdown.

### 3.5 Rate limiting

- New `src/services/security/rate-limit.ts`:
  - `await rateLimit(key, { limit, windowSec })` reads/writes `RATE_LIMIT_KV` with simple sliding window.
  - Apply to: `/api/webhooks/clerk` (60 rpm), server actions `exam.start`, `exam.submit`, `assignment.submit`, `materials.upload`, `payments.create` (R6), `ai.tutor.ask` (R8), `signup` (via Clerk).
- The decision log: rate limits live in `src/lib/security/rate-limit-config.ts` so they're reviewable.

---

## 4. UI/UX Changes — Component Splits

The audit identified these mega-components. Each is split as follows. **No visual change in this phase** — pure structural.

### 4.1 `src/components/student/exams/exam-taker.tsx` (811 lines → 4 files)

New structure:
- `exam-taker.tsx` (orchestrator, ~120 lines): owns state ownership, wires together the three pieces below.
- `exam-taker-question.tsx` (display): renders question, options, marks-for-review toggle. Pure controlled component.
- `exam-taker-palette.tsx`: navigator grid with answered/flagged/unvisited states; sub-modes: sheet on mobile, side rail on desktop.
- `exam-taker-controls.tsx`: timer, autosave indicator, submit drawer trigger.

Plus, extracted:
- `use-exam-timer.ts` (custom hook, in `src/components/student/exams/hooks/`)
- `use-exam-autosave.ts`
- `use-exam-keyboard-nav.ts`

### 4.2 `src/components/teacher/exams/builder/exam-builder.tsx` (754 lines → 4 files)

- `exam-builder.tsx` (~120): page shell + list/add
- `exam-builder-question-card.tsx`
- `exam-builder-question-editor.tsx` (split question-editor if needed)
- `exam-builder-settings-panel.tsx` (duration, attempts, marks)

### 4.3 `src/components/teacher/assignments/assignment-detail-view.tsx` (677 → 3)

- `assignment-detail-view.tsx` (server)
- `assignment-grading-drawer.tsx` (client)
- `assignment-submissions-table.tsx`

### 4.4 `src/components/teacher/exams/exam-detail-view.tsx` (582 → 3)

- `exam-detail-view.tsx` (server)
- `exam-attempts-table.tsx`
- `exam-results-table.tsx`

### 4.5 `src/components/student/assignments/student-assignment-workspace.tsx` (561 → 3)

- `student-assignment-workspace.tsx` (orchestrator)
- `assignment-submission-form.tsx`
- `assignment-file-list.tsx`

Also:
- `teacher/builder/curriculum-builder.tsx` (397) — split into `curriculum-builder.tsx`, `curriculum-tree.tsx`, `lesson-row.tsx`, `drag-handle.tsx` (and replace ad-hoc HTML5 drag with `@dnd-kit/core` — install as the one allowed client-side dependency).

---

## 5. New Infra Bindings

Update `wrangler.jsonc`:

```jsonc
{
  "kv_namespaces": [
    { "binding": "RATE_LIMIT_KV",   "id": "<new>" },
    { "binding": "SESSION_KV",      "id": "<new>" },
    { "binding": "FEATURE_FLAGS_KV","id": "<new>" }
  ],
  "queues": {
    "producers": [
      { "binding": "NOTIFICATIONS_QUEUE", "queue": "insidejibon-notifications" },
      { "binding": "EMBEDDINGS_QUEUE",    "queue": "insidejibon-embeddings" },
      { "binding": "EXPORT_QUEUE",        "queue": "insidejibon-csv-exports" }
    ]
  },
  "r2_buckets": [
    { "binding": "MATERIALS_BUCKET", "bucket_name": "insidejibon-materials" },
    { "binding": "PUBLIC_BUCKET",    "bucket_name": "insidejibon-public"   }
  ]
}
```

Mirrors in `.env.local`:
```
RATE_LIMIT_KV_URL=...   # local dev only
SESSION_KV_URL=...
FEATURE_FLAGS_KV_URL=...
MATERIALS_BUCKET=...
PUBLIC_BUCKET=...
```

And in `src/lib/env.ts` add `RATE_LIMIT_KV`, `SESSION_KV`, `FEATURE_FLAGS_KV`, `PUBLIC_BUCKET` to the typed `CloudflareEnv`. Use `getEnv()` inside handlers, never at module scope (per AGENTS.md).

---

## 6. Security Headers — `next.config.ts` Update

Replace the existing block at `next.config.ts:19-34` with:

```ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options',          value: 'DENY' },
      { key: 'X-Content-Type-Options',   value: 'nosniff' },
      { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',       value: 'camera=(self), microphone=(self), geolocation=()' },

      // Strict-Transport-Security: 2 years, include subdomains, preload-ready
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },

      // CSP: tailored for our app. Report-only to start, enforce after R1 lands.
      { key: 'Content-Security-Policy-Report-Only',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src  'self' data: https://fonts.gstatic.com https://r2.example.com",
          "img-src   'self' data: https: blob:",
          "media-src 'self' blob: https://*.r2.dev https://*.cloudflarestream.com",
          "connect-src 'self' https://*.clerk.accounts.dev https://*.neon.tech https://api.cloudflare.com",
          "frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
          "worker-src 'self' blob:",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
          "report-uri /api/csp-report"
        ].join('; ') },
    ],
  }];
}
```

Then add `src/app/api/csp-report/route.ts` — a 204-acknowledged endpoint that batches reports to the audit log.

Also: Turnstile is on the **free tier** (1M validations/month, no subscription needed). Add it to `/sign-in`, `/sign-up`, and any public form (in R6 payment intent and R9 proctoring if bot risk is detected). For R0, register a Cloudflare Turnstile site key in env; *do not* embed yet — keep R0 focused on refactor + security headers + indexes. R6 is the first phase that uses Turnstile live (on the bKash checkout page).

---

## 7. Performance — R2 Streaming → Signed Redirect

Today `api/materials/[materialId]/download/route.ts` streams the object through the Worker. Good for small files (no need to sign), but bad for big PDFs/videos.

Refactor:

- New `src/lib/storage/signed-url.ts` exposing `signGetUrl(bucket, key, { ttlSeconds })` using R2's `createPresignedUrl` (available via `@cloudflare/workers-types`).
- New `src/services/materials/download.ts`: action chooses `signed` (≥5 MB or `mime` starts with `video/`) or `proxy` (small files + previews).
- `route.ts` updates:
  - If `signed`: respond `307` to `signGetUrl(...)` with `Cache-Control: private, max-age=300`.
  - If `proxy`: stream as today with `Cache-Control: private, max-age=31536000, immutable`.

Verify by adding a unit test (Vitest, see §10) that small files still proxy.

---

## 8. Performance — Edge Cache

- `src/lib/cloudflare/cache.ts` exposes:
  ```ts
  edgeCache(request, fetcher, { ttl: 60, swr: 600, tags: ['courses:list'] })
  ```
- Apply to:
  - `/` marketing landing (60s TTL, 10min SWR)
  - `/courses` catalog (60s/10min)
  - `/courses/[slug]` detail (120s/30min) — Cloudflare-Cache-Tag: `course:${slug}`
  - `/teacher/[handle]` public teacher page (if added later)
- Cache invalidation hooks:
  - When a teacher publishes/updates/unpublishes a course, queue a `cache.purge` action that calls `caches.default` delete by tag.
- **Skip caching** any page that reads the session (per-user pages) or that uses `force-dynamic` for non-cache reasons — document the boundary in a comment block at the top of `src/lib/cloudflare/cache.ts`.

---

## 9. i18n Keys Required (R0 subset)

Add to both dictionaries, keyed under the existing namespaces plus a new `system.*`:

- `system.requestError`, `system.unauthorized`, `system.forbidden`, `system.rateLimited`, `system.serverError`
- `system.audit.roleChanged`, `system.audit.examPublished`, `system.audit.enrollmentGranted`
- `common.actions.retry`, `common.actions.discardChanges`
- `csp.violationReport.fallback` (the report endpoint localizes nothing, but `errorBoundary.useDocument` reads the fallback key)

The compiler-level check `npm run check:i18n` must remain green.

---

## 10. Testing Scaffold

Introduce Vitest (Cloudflare Workers pool: `@cloudflare/vitest-pool-workers` if compatible with Workers+OpenNext, else Node-pool for service-layer unit tests only). Cover:

- `services/exams/attempts.ts` — contentSnapshot not selected on status read.
- `services/security/rate-limit.ts` — sliding window math.
- `lib/storage/signed-url.ts` — URL TTL and signing shape.
- `lib/request-context.ts` — falls back to empty object in Node dev.

Skip e2e tests in R0 (R9 will add Playwright).

---

## 11. Verification Checklist

Run, in order:

1. `npm run check:i18n` — 100% parity.
2. `npx tsc --noEmit` — type clean.
3. `npm run lint` — lint clean.
4. `npm run build` — Cloudflare build clean.
5. `npm run preview` (or `npm run dev`) — local smoke:
   - Marketing landing loads with `cache-status: HIT` on second request (verify via `cf-cache-status`).
   - Large PDF download: HEAD shows a 307 to `*.r2.cloudflustorage.com` with TTL.
   - Webhook still 200 on signed events.
   - Rate limit triggers after 60 webhooks/min to a bogus endpoint.
6. Header check via `curl -I https://<worker>.workers.dev/`:
   - HSTS, CSP-RO, X-Frame, X-Content-Type, Referrer-Policy all present.
7. Component diff: each mega-component now under 250 lines and the directory tree still renders identically (visual diff via screenshot if you have one — otherwise manual smoke).
8. Audit log row written for `role.change` and `exam.publish` actions.

---

## 12. Copy-Paste Prompt

```markdown
# Phase R0 — Foundation Refactor & Hardening

Read `AGENTS.md`, `docs/MASTER_READMAP.md`, and `docs/MASTER_REMASTER.md` first.

## Tasks (in order)
1. Create migration `0001_remaster_r0_indexes_and_infra.sql` with all indexes, `request_dedupe`, `audit_log`, `feature_flags`.
2. Add `src/db/schema/audit.ts` and `src/db/schema/feature-flags.ts`.
3. Add `src/lib/cloudflare/{cache,kv,queues,r2}.ts` and `src/lib/request-context.ts`.
4. Update `wrangler.jsonc` with KV, Queues, PUBLIC_BUCKET.
5. Update `next.config.ts` headers per §6.
6. Split the 5 mega-components per §4 — **no visual change**.
7. Introduce shells at `src/components/shared/resource/{resource-directory,resource-form-shell,resource-detail-shell}.tsx`.
8. Replace `SELECT *` in services with explicit projections (§3.4).
9. Add `src/services/security/rate-limit.ts` and apply to webhook + exam + assignment + materials actions.
10. Refactor R2 download to signed-redirect for ≥5MB or video/* (§7).
11. Wrap marketing + catalog + course detail with `edgeCache` (§8).
12. Introduce `defineServerAction({role, schema, rateLimit})` helper, update new + critical actions.
13. Add Vitest config and tests per §10.
14. Update i18n dictionary keys per §9.
15. Run §11 verification checklist end to end.
16. Commit + push.
```
