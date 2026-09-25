# InsideJibon — Masterclass Remaster Roadmap

> **Goal:** Transform InsideJibon from a feature-complete edtech prototype into a masterclass, Bangladeshi-market-leading edtech platform — on par with (and differentiating from) Udvash, ACS, 10 Minute School, Shikho, Bohubrihi.
> **Cost commitment:** $0/month subscriptions. Every service is on its free tier or self-hosted. See [`FREE-TIER-REFERENCE.md`](./FREE-TIER-REFERENCE.md) for quotas.
> **Scope of this document:** vision, principles, stack additions, phase table, success metrics. Per-phase specs live in `docs/remaster-phase-N-*.md`.

---

## 1. North Star

> **A Bangladeshi student can go from "I have an exam in 6 weeks" to "I'm top of the class" without ever leaving InsideJibon — learning live, asking doubts, taking mock tests, earning streaks, and having their parent see the progress — all on a fast, beautiful, Bangla-first interface.**

The remaster optimizes for **three rings of value**, in order:

1. **Daily learning loop** — open app → see today's routine → join live class → ask doubts → take a 10-min quiz → streak grows.
2. **Mastery loop** — finish unit → unlock next unit (Khan-style) → earn XP/badge → rank up the league.
3. **Trust loop** — parent sees real progress, certificates print, results are verifiable, content is offline-capable.

---

## 2. Design Principles

1. **Academic Modernism, refined.** Generous whitespace, honest typography, neutral surfaces, deliberate motion. No emoji clutter, no stock illustrations, no decorative gradients. One accent color per role (student = emerald, teacher = indigo, admin = slate, parent = rose).
2. **Bangla-first, English-equal.** All copy ships Bangla by default; English is the same i18n dictionary. Bangla numerals available globally. Bangla font (Hind Siliguri / Noto Sans Bengali) is a first-class asset, loaded once, hinted correctly.
3. **Keyboard-first, mobile-faithful.** ⌘K command palette everywhere. `?` opens shortcuts. Every page works one-handed on a 360px-wide phone.
4. **Optimistic, never spinny.** Server actions return the new state. Lists use `useOptimistic`. Forms submit and stay focused. Skeletons only where layout can't be predicted.
5. **Edge by default.** Pages that don't need per-user data are cached at the edge. Pages that do need it return in ≤300ms P75 on the Workers runtime.
6. **Resource-light.** DB queries project the columns they need. JSONB blobs live behind separate fetches. Downloads stream through R2, not the Worker.
7. **Privacy & safety first.** Webhooks signed. Server actions gated. Rate limits everywhere. Proctoring is opt-in and explicit. No student data leaves Workers/Neon/R2/Clerk.

---

## 3. Stack — What's New vs. What's Locked

> **Cost commitment: $0/month subscriptions across every service.** Every addition below is on its free tier, or self-hosted with no subscription. Per-transaction provider fees (e.g. bKash merchant rate on a single payment) are not subscription costs and may apply. See [`FREE-TIER-REFERENCE.md`](./FREE-TIER-REFERENCE.md) for the authoritative quota table.

### Locked (existing)
- Next.js 16 App Router on Cloudflare Workers via `@opennextjs/cloudflare` (Workers **Free plan**)
- React 19, Tailwind v4, TypeScript
- Drizzle ORM + Neon HTTP driver (PostgreSQL) — Neon **Free tier**
- Clerk (manual JWT verification, webhooks) — within Clerk **Free tier** (≤10k MAU)
- Cloudflare R2 (storage) — free egress
- Custom Tailwind design system (no Radix, no shadcn)
- Bangla + English i18n

### New additions (Cloudflare-native, all free-tier)
| Service | Use | Free-tier note | First used in |
|---|---|---|---|
| **Durable Objects** | Live class room (signaling/presence/chat/raise-hand/attendance) | 100k req/day + SQLite storage | R3 |
| **Workers KV** | Rate-limit buckets, edge-cache tags, feature flags | 100k reads/day, 1k writes/day | R0 |
| **Queues** | Async notification fan-out (in-app + email + web push), CSV export jobs, embedding jobs, HLS transcode queue | 1M msg/month | R0/R8 |
| **Workers AI** | AI tutor embeddings + chat completions, translation (Bangla↔English), AI quiz generation | 10k Neurons/day | R8 |
| **Vectorize** | RAG index over lesson content (chunked + embedded) | ~30M vector dims stored | R8 |
| **R2 custom public domain** | Thumbnails, og images, marketing assets, **self-hosted HLS video** — served off-Worker, free egress | R2 free egress | R2 |
| **Cloudflare Cache API** | Edge-cache marketing + public catalog + course detail + teacher profile | Free | R0/R2 |
| **Cloudflare Image Resizing** | WebP variants for thumbnails/og | Zone-level setting, free | R2 |
| **Cloudflare Email Service** | Transactional email (replaces Resend/Postmark) — *Email Sending via Workers binding + Email Routing* | Free | R10/R7 |
| **YouTube Unlisted embeds** | **Default $0 video backend** for VOD + live classes. Teacher pastes a YouTube Unlisted URL → we embed `youtube-nocookie.com` iframe (no API key, free bandwidth on YouTube's CDN). | Free (no API key needed) | R2/R3 |
| **YouTube auto-captions** | **RAG source** for the AI tutor — fetched via the public `youtube-transcript` package, chunked + embedded in Vectorize. | Free (no API key) | R8 |
| **Self-hosted HLS packager** | Optional fallback for teachers who decline YouTube — ffmpeg run inside a Worker or via GitHub Actions cron, output → R2 PUBLIC_BUCKET. Not the default. | Free (Actions free tier: 2k min/month) | R2 (fallback) |
| **Workers Analytics Engine** | Per-route latency, cache-hit, AI usage, push delivery | Free | R0+ |
| **Web Push via VAPID** | Self-issued VAPID keys; pushes directly from Workers | Free | R9 |
| **Turnstile** | Bot mitigation on signin/signup/enrollment/payment intent | Free (1M validations/mo) | R0+, used conservatively |
| **bKash Tokenized Payment** | Paid course bundles & invoices — *only* payment provider in scope | Free integration, per-txn fees per bKash published rate | R6 |

### Explicitly NOT in scope (would be paid; deferred indefinitely)
- Resend / Postmark / SendGrid / Twilio — replaced by **Cloudflare Email Service** (free).
- Stripe / SSLCommerz / Paddle / Lemon Squeezy — replaced by **bKash Tokenized** (free integration). No international processor.
- Cloudflare Stream / Mux / api.video — replaced by **self-hosted HLS** on R2.
- PostHog / Plausible / GA4 / Datadog / New Relic / Sentry — replaced by **Workers Analytics Engine** + Workers log drain.
- Vercel / Netlify — we deploy to Cloudflare Workers (free).
- Any SMS provider — outside scope; we use email + in-app + web push only.

### What we use on the side (no cost)
- **YouTube Unlisted** — teachers upload videos there and paste the link. Our Worker validates via the public `oembed` endpoint (no API key). For live classes, YouTube Live Unlisted serves the broadcast.
- A **GitHub Actions cron workflow** — only used if a teacher opts out of YouTube; ffmpeg-transcodes the upload into HLS variants + segments to R2 (Actions free: 2,000 min/month).
- A **VAPID keypair** generated once in repo (Workers signs and dispatches Web Push — no middleman).

---

## 4. Phase Table — 11 Phases, Ordered for Safe Rollout

Each phase is independently shippable. Phases marked ⛓ block the next; others can run in parallel teams.

| # | Phase | ⛓? | Theme | Phase doc |
|---|---|---|---|---|
| **R0** | Foundation Refactor & Hardening | ⛓ | Tech debt, security, perf, edge scaffolding | [`remaster-phase-0-foundation.md`](./remaster-phase-0-foundation.md) |
| **R1** | Design System 2.0 & Dashboard Overhaul | — | Tokens, dark mode, Bangla font, ⌘K, skeletons | [`remaster-phase-1-design-system.md`](./remaster-phase-1-design-system.md) |
| **R2** | Edge Caching, R2 Custom Domain & HLS Video | ⛓ | Cache API, off-Worker assets, HLS playback | [`remaster-phase-2-cdn-video.md`](./remaster-phase-2-cdn-video.md) |
| **R3** | Live Class Room (DO + signaling) | ⛓ | Real-time class with chat/raise-hand/attendance/replay | [`remaster-phase-3-live-class.md`](./remaster-phase-3-live-class.md) |
| **R4** | Doubt Q&A, Threading & Leaderboard | — | Stack-Overflow-style Q&A on lessons, weekly XP rank | [`remaster-phase-4-qna-leaderboard.md`](./remaster-phase-4-qna-leaderboard.md) |
| **R5** | Gamification (XP, Streaks, Badges, Leagues) | — | Duolingo-style daily streaks, energy on quizzes | [`remaster-phase-5-gamification.md`](./remaster-phase-5-gamification.md) |
| **R6** | Payments, Bundles & Enrollment Gate | ⛓ | bKash Tokenized Payment, course bundles, receipts (free) | [`remaster-phase-6-payments.md`](./remaster-phase-6-payments.md) |
| **R7** | Parent Panel & Linked Accounts | — | Parent role, parent_student_links, digest emails | [`remaster-phase-7-parent-panel.md`](./remaster-phase-7-parent-panel.md) |
| **R8** | AI Tutor (Workers AI + Vectorize RAG) | — | RAG chat scoped per course, AI quiz generator | [`remaster-phase-8-ai-tutor.md`](./remaster-phase-8-ai-tutor.md) |
| **R9** | Offline PWA, Web Push & Exam Proctoring | — | Service worker, cached lessons, fullscreen-lock exams | [`remaster-phase-9-pwa-proctoring.md`](./remaster-phase-9-pwa-proctoring.md) |
| **R10** | i18n, Legal & Email Templates | — | legal.*, email.*, BDT currency, validation strings | [`remaster-phase-10-i18n-legal-email.md`](./remaster-phase-10-i18n-legal-email.md) |

**Suggested critical path (a single team):** R0 → R1 → R2 → R3 → R6 → R7. R4/R5/R8/R9/R10 can run in parallel once R0 lands.

---

## 5. Phase Output Contract

Every phase doc in `docs/remaster-phase-N-*.md` follows this structure so agents can pick them up cold:

```
1. Objectives (bullet list)
2. Data model changes (drizzle migration sketches)
3. Service layer changes (file paths + responsibility)
4. UI/UX changes (which routes/components)
5. New infra (DOs / KV namespaces / Queues / Cache rules)
6. Security & performance checklist
7. i18n keys required
8. Verification: i18n parity, tsc, lint, build, manual QA
9. Copy-paste prompt to start the phase in a fresh session
```

---

## 6. Cross-Cutting Non-Functional Requirements

These are checked **every** phase. A phase that ships without these is not done.

### Security
- Every server action calls `requireUser()`/`requireRole()` from `src/lib/permissions.ts`.
- Every mutation goes through a zod schema at the trust boundary.
- Every route handler sets `Cache-Control: no-store` if it returns per-user data; `public, max-age=N, s-maxage=N` otherwise.
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy are set in `next.config.ts` headers.
- Rate limits on: webhook ingestion, login, exam start, exam submit, assignment submit, AI tutor request, file upload.
- Webhooks signed (Clerk + payment provider); replay-safe via `dedupe` table or KV idempotency keys.

### Performance budgets
| Metric | Target |
|---|---|
| Marketing pages TTFB P75 (edge-cached) | ≤50ms |
| Dashboard SSR P75 (uncached) | ≤400ms |
| Exam taker interactive (LCP) | ≤1.2s on a 4G mobile |
| Bundle (student route first-load JS) | ≤180KB gz |
| DB query count per page | ≤6 (was up to 12 in places) |
| R2 download latency | stream via Worker for small files, **redirect to R2 custom domain** for assets |

### Accessibility
- All interactive elements keyboard-reachable, visible focus rings.
- Modals trap focus, return on close, `Esc` closes.
- Color contrast ≥ AA on Academic Modernism palette.
- Bangla + English mixed strings render correctly (no direction reversal).
- Screen-reader announcements for toasts, timer warnings, streak milestones.

### Privacy
- Student personal data never logged.
- Webcam proctoring recordings opt-in per exam, encrypted in R2, auto-deleted after 30 days.
- Parent access is **read-only** on linked child's data; no write access.
- Payment receipts stored without full card number; only last-4 and provider txn id.

---

## 7. Top 10 Wins by End of Remaster

1. **Page-load speed:** marketing pages are edge-cached and return in <100ms.
2. **Live classes** are first-class — students never leave the app for a class. Video runs on **YouTube Live Unlisted** (free); our DO owns presence, chat, raise-hand, attendance.
3. **Bangla-first** with proper typography; English equal, not preferred.
4. **Doubt Q&A** with peer answers + teacher pin.
5. **Daily streak + XP + leagues** — Duolingo-grade engagement loop.
6. **AI tutor** scoped to enrolled courses — students ask "explain this lesson" in Bangla or English and get a citation that opens the YouTube embed at the exact second (Workers AI + Vectorize over YouTube captions, free tier).
7. **bKash** paid course bundles — first BD-edtech to ship with the full free-stack.
8. **Parent digest** email + dashboard — peace of mind for the household.
9. **Offline PWA** — recorded lessons work in a rickshaw with no signal.
10. **Proctored exams** — fullscreen lock + tab-switch warnings + optional webcam.
11. **$0 video bandwidth** — every minute of lesson video streams off YouTube's CDN at zero cost to InsideJibon. Self-hosted HLS on R2 remains as the opt-out path for brand-sensitive teachers.

---

## 8. Anti-Goals (we will NOT do these)

- No native mobile app (PWA-only).
- No video DRM (YouTube Unlisted is our default; for the opt-in self-hosted path we use Cloudflare-signed HLS — neither is Widevine/DRM-grade). Widevine would block low-end devices *and* cost money.
- No multi-tenant (separate schools). One InsideJibon, many students.
- No chat/messaging between arbitrary users. Q&A is lesson-scoped, moderated.
- No multi-language beyond English/Bangla (no Hindi/Urdu yet — explicitly out of scope).
- No video transcoding on the hot path. ffmpeg runs only via GitHub Actions cron (free 2k min/month), and only when a teacher explicitly opts out of YouTube.

---

## 9. Success Metrics (6 months post-launch)

- **DAU/MAU ≥ 35%** (BD edtech average is ~20%)
- **Avg session ≥ 18 minutes** (was historically ~6)
- **Streak D30 retention ≥ 12%** (Duolingo is ~7%)
- **Live class attendance ≥ 60% of enrolled**
- **AI tutor satisfaction ≥ 4.3/5**
- **Parent account activation ≥ 25% of paid enrollments**
- **P75 exam-taker LCP ≤ 1.2s on mid-range Android**
- **Monthly Worker invocations ≤ 60% of pre-remaster** (despite feature growth — caching + presigned URLs)
- **$0 monthly subscriptions** paid by InsideJibon (per-txn bKash merchant fees are the only cost, charged to payer)

---

## 10. How to Use This Document

1. Pick a phase from the table.
2. Open its `remaster-phase-N-*.md`.
3. Read the **Objectives** + **Verification** sections; everything else is guidance.
4. Run the **copy-paste prompt** at the bottom of the phase doc inside a fresh agent session, with `AGENTS.md` already loaded.
5. Land one phase before starting the next on the critical path.
