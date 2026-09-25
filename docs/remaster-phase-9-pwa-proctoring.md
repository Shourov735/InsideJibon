# Remaster Phase R9 — Offline PWA, Web Push & Exam Proctoring

> **Phase:** R9 (after R0–R7). Can run in parallel with R8.
> **Theme:** Make InsideJibon installable on Android/iOS, work offline for already-viewed lessons, **Web Push** notifications via self-issued VAPID, and **exam proctoring** that respects student privacy.
> **Cost commitment:** **$0 paid**. Service worker is free. Web Push uses our self-issued VAPID keys — no paid middleman. Proctoring recordings stay in R2 (free egress).

Read `AGENTS.md`, `docs/MASTER_ROADMAP.md`, `docs/MASTER_REMASTER.md`, and [`FREE-TIER-REFERENCE.md`](./FREE-TIER-REFERENCE.md) first.

---

## 1. Objectives

1. **PWA manifest + service worker** — install on Android/iOS homescreen, splash screen, app-shell cached.
2. **Offline content** — last-N viewed lessons cached via service worker (precache strategy: stale-while-revalidate); assignment drafts queued for resubmit.
3. **Web Push** — students/parents/teachers opt-in per category (live reminder, grade posted, new doubt answer, etc.). VAPID keypair generated in repo; pushes dispatched from a Worker.
4. **Exam proctoring** — three opt-in features:
   - **Fullscreen lock** — exam taker requests fullscreen on start; exits are logged.
   - **Tab-switch detection** — `visibilitychange` listener logs each switch; ≥3 in an attempt triggers a flag.
   - **Webcam recording** — opt-in per exam; `MediaRecorder` records the entire attempt and uploads to R2 in 30 s chunks via signed URL. Recording auto-deleted after 30 days.
5. **Proctoring review UI** for teachers — flagged attempts surface in the grading view with a timeline of events.
6. **Anti-cheat policy** in exam settings — teachers toggle per exam: fullscreen required / tab-switch flagged / webcam required.

---

## 2. Data Model Changes

### Migration `0009_remaster_r9_pwa_proctoring.sql`

```sql
-- Web Push subscriptions
CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id              UUID PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL UNIQUE,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  user_agent      TEXT,
  locale          TEXT NOT NULL DEFAULT 'en',
  categories      TEXT[] NOT NULL DEFAULT ARRAY['live_reminder','grade_posted','qa_replied'],
  enabled         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS web_push_subscriptions_user_idx ON web_push_subscriptions (user_id) WHERE enabled;

-- Proctoring events per attempt (timeline)
CREATE TABLE IF NOT EXISTS exam_proctor_events (
  id              BIGSERIAL PRIMARY KEY,
  attempt_id      UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id),
  kind            TEXT NOT NULL,                    -- 'fullscreen.exit','tab.blur','tab.focus','webcam.start','webcam.chunk','webcam.stop','paste','rightclick'
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exam_proctor_events_attempt_idx ON exam_proctor_events (attempt_id, created_at);
CREATE INDEX IF NOT EXISTS exam_proctor_events_user_idx ON exam_proctor_events (user_id, created_at DESC);

-- Proctoring settings per exam (teacher-controlled)
ALTER TABLE exams
  ADD COLUMN proctor_fullscreen_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN proctor_tab_switch_flag     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN proctor_webcam_required     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN proctor_webcam_storage_key  TEXT;   -- R2 key of concatenated recording

-- Per-attempt flags (denormalized summary for fast queries)
ALTER TABLE exam_attempts
  ADD COLUMN proctor_flag_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN proctor_flagged    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN proctor_reviewed_at TIMESTAMPTZ,
  ADD COLUMN proctor_reviewed_by TEXT REFERENCES users(id);

-- Offline submission queue (assignment drafts / unsynced answers)
CREATE TABLE IF NOT EXISTS offline_outbox (
  id            UUID PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  kind          TEXT NOT NULL,                     -- 'assignment.submit','exam.answer.save'
  payload       JSONB NOT NULL,
  client_id     TEXT NOT NULL,                     -- idempotency key from the device
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at     TIMESTAMPTZ,
  UNIQUE (user_id, client_id)
);
CREATE INDEX IF NOT EXISTS offline_outbox_unsynced_idx ON offline_outbox (synced_at) WHERE synced_at IS NULL;
```

---

## 3. Service Layer

### 3.1 `src/services/pwa/manifest.ts` + `public/sw.js` (or built via Workbox)
- Workbox is *optional* — we ship a small (~3KB) hand-written SW to avoid a dependency. (Workbox is fine if your team prefers it; both are free.)
- Precache shell: `app/layout.tsx` HTML, fonts, the locale dictionaries for the active locale, the lesson-player shim.
- Runtime cache:
  - `/api/lessons/[id]/video-manifest` → stale-while-revalidate, max 5 entries.
  - `/api/notifications/recent` → network-first, fallback to cache.
  - `/static/*` and the CDN domain → cache-first.
- Background Sync API: when offline and assignment/exam attempt submits, push to `offline_outbox` instead. On reconnect, the SW posts to `/api/offline/sync` which drains the outbox.

### 3.2 `src/services/push/vapid.ts`
- `generateVapidKeys()` — one-time, executed locally; public key shipped via env (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`), private key stored as Worker secret (`VAPID_PRIVATE_KEY`).
- `signJwt({ audience, subject, exp })` — VAPID JWT signing using `crypto.subtle`.

### 3.3 `src/services/push/subscriptions.ts`
- `registerSubscription(userId, sub, categories, locale)` — upsert into `web_push_subscriptions`.
- `unregisterSubscription(userId, endpoint)`.
- `listSubscribers({ category, courseId?, userId? })` — used by fan-out jobs.

### 3.4 `src/services/push/send.ts`
- `sendPush(subscription, payload)` — dispatches to the endpoint per the Web Push protocol (using `web-push` library's pure-Node crypto, re-implemented for Workers) — fully free, no service.
- `fanOut(category, payload, { courseId? })` — selects matching subscriptions, dispatches in parallel (concurrency 16) via `Promise.allSettled`, removes dead endpoints on 404/410.
- Honors **per-user rate-limit** (R0 KV) — max 20 push notifications / day / user across all categories.

### 3.5 `src/services/proctoring/events.ts`
- `recordEvent(attemptId, userId, kind, payload)` — inserts `exam_proctor_events` row.
- `summarizeAttempt(attemptId)` — returns `{ tabSwitches, fullscreenExits, webcamChunks, flags }`.
- `flagAttempt(attemptId)` — sets `exam_attempts.proctor_flagged=true`, emits notification to teacher.

### 3.6 `src/services/proctoring/webcam.ts`
- Teacher enables `proctor_webcam_required=true` on the exam.
- On student attempt start: R2 signed URL issued for `proctoring/<attemptId>/<n>.webm` chunks.
- Browser `MediaRecorder` uploads chunks every 30s.
- On submit: `POST /api/exam-attempts/[id]/proctor/finalize` concatenates (server-side action marker; no real-time concat needed because chunks are independently playable).
- A **lifecycle job** (cron every 24h) deletes chunks older than 30 days.

### 3.7 `src/services/pwa/offline-sync.ts`
- `POST /api/offline/sync` — drains `offline_outbox WHERE user_id=$1 AND synced_at IS NULL`, replays each as the corresponding server action, marks synced.

---

## 4. UI/UX Changes

### 4.1 PWA install banner
- After 2nd visit, show a non-blocking bottom-right banner: "Install InsideJibon for offline access." Uses `beforeinstallprompt`.

### 4.2 Push opt-in modal
- On first notification bell click: "Get push notifications for live reminders and grades" with category toggles.
- Always one-tap to unsubscribe.

### 4.3 Service worker UI
- `navigator.serviceWorker.controller` detection → a "Working offline" pill in the nav when offline.
- Reconnect → toast "Back online — synced 3 drafts."

### 4.4 Exam proctoring UI
- **Lobby** before exam start (already exists in exam-taker): "This exam has fullscreen & webcam checks. We'll need your permission." Permission requests for camera + screen-state capture.
- **In-exam toolbar** shows current state:
  - "Fullscreen ✅" / "Fullscreen ⚠ Exit to flag" button.
  - Tab-switch warning toast (no auto-submit).
  - Webcam dot: green if recording, gray if stopped.
- **Teacher grading view** — flagged attempts show a timeline rail at the right side with event chips (e.g. "Tab blur at 14:32", "Webcam stopped at 16:01").
- **Reviewer** can mark "accept attempt" / "void attempt".

### 4.5 ⌘K integration (R1)
- "Enable offline for: {course}" — pre-caches that course.
- "Sync now" — forces offline outbox drain.

---

## 5. Security & Performance Considerations

- **VAPID private key** lives only as a Worker secret. JWT minted per push, 12 h TTL.
- **No third-party push gateway** — direct dispatch to Mozilla/Apple/Google endpoints from Workers.
- **Webcam chunks uploaded directly to R2** via signed URL; we never proxy the binary through the Worker.
- **Permission denied UX** — if student denies camera, exam still starts but is flagged. Same for fullscreen deny.
- **CSP** updated to allow `worker-src 'self' blob:` for the SW, and to allow our push endpoints (`https://*.push.apple.com`, `https://fcm.googleapis.com`, `https://updates.push.services.mozilla.com`) in `connect-src`.
- **Anti-cheat drift**: `proctor_flag_count` is incremented via atomic `UPDATE` with `WHERE attempt_id = $1` — no race even on neon-http.
- **Offline outbox idempotency**: each client_id is unique per device+action; replay-safe.
- **Rate limit**: web push ≤ 20 / user / day; proctor event ingestion unbounded (teacher-controlled visibility).
- **Performance**: SW is a tiny static file (≤ 5KB) cached `Cache-Control: public, max-age=31536000, immutable`. Web Push dispatch uses `Promise.allSettled` with batch size 50.
- **Storage**: proctoring chunks deleted after 30 days by Cron Worker.
- **Privacy**: the proctor review UI never auto-shares webcam with parents; only teachers of the course see it.

---

## 6. i18n Keys Required (R9)

- `pwa.install.title`, `install.button`, `install.dismissed`
- `pwa.offline.banner`, `offline.reconnected`, `offline.syncedDrafts`
- `push.optin.title`, `push.optin.description`, `push.categories.liveReminder`, `gradePosted`, `qaReplied`, `paymentReceipt`
- `push.unsubscribeConfirm`
- `proctor.lobby.fullscreen`, `webcam`, `start`
- `proctor.runtime.fullscreenOn`, `fullscreenExit`, `tabSwitched`, `webcamOn`, `webcamOff`
- `proctor.review.flagged`, `events.tabBlur`, `events.fullscreenExit`, `events.webcamStop`, `actions.accept`, `void`

---

## 7. Verification Checklist

1. `npm run check:i18n`, `npx tsc --noEmit`, `npm run lint`, `npm run build` green.
2. Lighthouse PWA audit: installable, has manifest, service worker registered, splash screen defined.
3. Add to home screen on Android Chrome → app launches standalone.
4. Toggle airplane mode after viewing 3 lessons → those lessons still play; assignment draft created offline → upon reconnecting, syncs.
5. Web Push: opt-in → fire test from a Worker → push arrives within 5 s.
6. Proctoring: enable all 3 checks on a sample exam → student attempts → events timeline shows fullscreen exit, tab switch, and webcam chunks uploaded.
7. Cron deletes a 30-day-old proctor chunk (verify with test fixture).
8. Worker push dispatch stays inside Workers free request quota (push counts as a request per recipient).
9. SW is ≤ 5 KB minified and serves 200 from cache after pre-cache.
10. R0 KV rate limit triggers at 21st push in 24h.

---

## 8. Copy-Paste Prompt

```markdown
# Phase R9 — Offline PWA, Web Push & Exam Proctoring

Read `AGENTS.md`, `docs/MASTER_READMAP.md`, `docs/MASTER_REMASTER.md`, and `docs/FREE-TIER-REFERENCE.md` first.

## Tasks
1. Run migration `0009_remaster_r9_pwa_proctoring.sql`.
2. Generate VAPID keypair locally; add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to env and `VAPID_PRIVATE_KEY` as a Worker secret.
3. Build `public/sw.js` (or Workbox) per §3.1.
4. Add `src/services/push/{vapid,subscriptions,send}.ts`; bind to NOTIFICATIONS_QUEUE.
5. Build push opt-in modal + permission categories.
6. Build PWA install banner + offline-state pill.
7. Build proctoring event service + UI (lobby + in-exam + teacher review).
8. Wire proctoring webcam chunks → R2 signed URLs.
9. Build offline-outbox sync endpoint + UI banner.
10. Add Cron Trigger for 30-day proctor chunk purge.
11. Update CSP (R0) for SW + push endpoints.
12. Add i18n keys per §6.
13. Run §7 verification checklist.
14. Commit + push.
```
