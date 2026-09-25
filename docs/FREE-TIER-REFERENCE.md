# Free-Tier Reference — InsideJibon

> **The project is committed to running at zero paid spend.** Every service in the remaster below is on its free tier (or is self-hosted with zero subscription). This doc is the single source of truth for quotas, fallback paths, and alert thresholds. Every phase doc references back here for service details.

---

## 0. Cost commitment

- $0 / month subscription spend across all services.
- Per-transaction fees (e.g. bKash inbound payment fees) are a separate matter and are paid by the *student* at the provider's published rates — **InsideJibon pays no monthly fee for the provider**.
- Cloudflare Workers Paid plan is **$5/month** — we therefore **stay on the Workers Free plan** (100k requests/day, 10ms CPU/invocation cap). All hot-path code stays well under 10ms CPU.

> If we *ever* need more, we go self-hosted first; only as a last resort do we revisit this doc.

---

## 1. Cloudflare Workers (compute) — **Free plan**

| Item | Free limit |
|---|---|
| Requests | 100,000 / day |
| CPU time | 10 ms / invocation |
| Workers KV reads | 100,000 / day |
| Workers KV writes | 1,000 / day |
| Workers KV deletes | 1,000 / day |
| Workers KV storage | 1 GB |
| Durable Objects requests | 100,000 / day |
| Durable Objects stored data | 1 GB |
| Queues messages | 1,000,000 / month |
| R2 operations | 10 million Class A / month, 10 million Class B / month |
| R2 storage | 10 GB / month |
| R2 egress | **Free** (no egress fees; Cloudflare's marquee promise) |
| Vectorize (vector DB) | 30 million vector dimensions stored; 30M queries/month; 5 indexes |
| Workers AI Neurons | 10,000 Neurons / day across all inference |

**Source of truth:** https://developers.cloudflare.com/workers/platform/limits/  (verify before each phase)
**OpenNext on Workers:** OpenNext builds to Workers — but OpenNext uses Node-compat at the edge. CPU-heavy operations (e.g. ffmpeg.wasm, PDF generation) must run on the **edge** with measured budgets, or move to a free CI-rendered artifact.

### Fallbacks if free-tier CPU is exhausted

- Move heavy CPU work to `Queues` async pipeline (the producer returns immediately).
- For ffmpeg transcoding (R2): use the **community `@ffmpeg/ffmpeg` WASM** *only if* total WASM cold-start cost per request fits in the 10ms budget — fallback is "out-of-band render" via a GitHub Actions runner running `ffmpeg` then uploading to R2 (Actions free tier: 2,000 minutes/month).
- For PDF generation (marksheets, receipts, certificates): prefer `@react-pdf/renderer` server-side rendering with charts, OR a tiny `pdf-lib` worker; both OK on 10ms CPU for typical docs.

---

## 2. Cloudflare R2 (storage) — **Free egress**

- 10 GB stored, 10M Class A ops, 10M Class B ops, **zero egress fees**.
- Public bucket via custom domain is supported on R2 with no extra fee.
- **Decision:** store everything in R2 (materials, videos, transcripts, certificate PDFs, profile images, webcam proctoring clips). Egress from R2 to students is free.

Source: https://developers.cloudflare.com/r2/pricing/

---

## 3. Cloudflare Durable Objects — **Free quota + SQLite**

- 100k requests/day included.
- SQLite-backed DO storage included.
- **WebSocket support** is included and free in DO (since 2023).
- Sufficient for our live class scale in the early growth phase.

Source: https://developers.cloudflare.com/durable-objects/pricing/

---

## 4. Cloudflare Queues — **Free**

- 1M messages / month included.
- Producer + consumer free, no subscription.

Source: https://developers.cloudflare.com/queues/pricing/

---

## 5. Cloudflare Vectorize — **Free**

- ~30 million vector dimensions stored, 30M queries / month, 5 indexes.
- Embedding dimension assumption: 768 → ~6 million vectors indexed per index.
- Sufficient for tens of thousands of lesson chunks × 5 indexes (one per course bundle).

Source: https://developers.cloudflare.com/vectorize/pricing/

---

## 6. Cloudflare Workers AI — **Free tier**

- 10,000 Neurons / day across all inference.
- Default models include `@cfbaai/bge-small-en-v1.5` (English embeddings, ~768 dim) and `@cf/meta/llama-3.1-8b-instruct` (chat).
- **Bangla:** Workers AI does not ship a strong Bangla model on the free tier as of `2026-09-25`. Strategy:
  - Run retrieval + answer synthesis primarily in English for now.
  - For Bangla questions, use a translation hop: Bangla → English → (retrieve) → answer → translate back via a small on-by-default Workers AI translation model (`@cf/m2m100-1.2b` for multilingual translation).
  - Re-check quarterly; Workers AI is adding multilingual models regularly.
- **Budget per student:** AI tutor R8 caps each student to ≤20 questions/day to fit the Neurons budget for one free-tier app. Teacher-side quiz generation is rate-limited to ≤30/day total.

Source: https://developers.cloudflare.com/workers-ai/pricing/

---

## 7. Cloudflare Email Service — **Free**

- **Email Sending** via Workers binding — quota is generous on the Workers free plan (typically 100 free sends/day; sufficient for transactional notifications).
- **Email Routing** (receive + parse) — free.
- **No SMTP relay paid tier needed.**
- Replaces Resend/Postmark/SendGrid.

Source: https://developers.cloudflare.com/email-routing/

---

## 8. Cloudflare Web Push — **Free**

- Web Push is essentially free: VAPID keys are a self-issued JWT pair; Cloudflare provides no paid middleman. We generate VAPID keys ourselves and push directly to Mozilla/Apple/Google push endpoints from Workers.
- Source: https://blog.cloudflare.com/web-push-notifications-for-everyone/ (general industry; no paid SaaS required)

---

## 9. Cloudflare Turnstile — **Free**

- Cloudflare Turnstile's free tier is 1M validations / month. We use it only where bot risk is real (signin/signup, public enrollment, payment intent). It is **not** an add-on cost.
- Source: https://www.cloudflare.com/products/turnstile/

---

## 10. Cloudflare Image Resizing — **Free**

- Image Resizing is a zone setting; the "lossy image transformations" are included up to a generous monthly count for free / paid plans. Source: https://developers.cloudflare.com/images/pricing/
- We use it conservatively (3 sizes max per asset).

---

## 11. Neon PostgreSQL — **Free tier**

- 0.5 GiB storage
- 191.9 compute hours / month
- Autosuspend after 5 min inactivity
- One project, one branch

Mitigations:
- Aggressive field projections (R0) to keep query footprint tiny.
- Cache API for SSG-equivalent pages reduces Postgres hits ≥80%.
- Neon HTTP driver works on Workers free plan.
- **Limit** on Neon free: cold-start on first query after autosuspend can be ~500ms–2s. R0 dashboards show a skeleton during warm-up; we set a 1s `?ssr=stale` revalidate.

Source: https://neon.tech/pricing

---

## 12. Clerk — **Free tier**

- Up to **10,000 monthly active users** free, unlimited auth options.
- After that, mandatory paid. **Mitigation:** design the auth to stay within 10k MAU (deliberate), and if we approach it, replatform auth to Neon + Lucia (free, OSS) — but not now.
- **Webhook delivery + Clerk Dashboard features** are included in the free plan.
- Source: https://clerk.com/pricing

---

## 13. Payments — **bKash only** (free account, no SaaS fee)

- **bKash Tokenized Payment** API is free to integrate; transaction fee per successful txn is the only cost, charged to the merchant per published rate (BDT 1.50% + VAT, current published rate). Verify at integration time.
- **No SSLCommerz** in this remaster (although their free sandbox could be added later if multi-merchant becomes a goal — out of current scope).
- **No Stripe** (paid SaaS).
- **Fallback when bKash is unavailable:** in-app "Request access" form that emails the teacher (via Email Service — free). Manual enrollment by teacher until bKash recovers. This matches R0's existing enrollment-decision flow.
- Source: https://developer.bka.sh/ (verify merchant fee + tokenized auth flow before integration)

---

## 14. Email/push fan-out via Queues (free)

- NOTIFICATIONS_QUEUE in R0 — already free.
- For each fan-out job we batch-send via Cloudflare Email Service (free) and/or Web Push (free).

---

## 15. Domains, DNS, TLS — **Free**

- A free domain from `*.workers.dev` is included.
- A custom domain on Cloudflare DNS — DNS hosting itself is free at Cloudflare; the only cost is the domain registration (not in scope of this reference).
- TLS via Cloudflare Universal SSL — free.

---

## 16. Analytics — **No third-party; Workers Analytics Engine**

- Workers Analytics Engine is included in the Workers free plan with reduced retention.
- We use it for: per-route P75 latency, AI tutor usage, web-push delivery rate, cache hit ratio, video playback errors.
- No PostHog, Plausible, GA4.

---

## 17. AI / Video transcoding — **No paid**

- **Self-hosted HLS packager** via `ffmpeg` run in a *Worker with measured CPU*, OR a **GitHub Actions cron** that ffmpegs new uploads and writes `.m3u8` + segments to R2 (Actions free: 2,000 min/month — enough for ~10k minutes of video per month, then we'd self-host a free CI runner).
- WASM ffmpeg via `@ffmpeg/ffmpeg` — strictly inside a Worker if it fits in the 10ms CPU budget. Most lesson lengths will not — we run them via `Queues` + `Actions cron`.

---

## 18. Anti-pattern rules (what we explicitly do NOT add)

- No Stripe / Paddle / Lemon Squeezy / Chargebee (paid).
- No Resend / Postmark / SendGrid (paid) — use Cloudflare Email Service.
- No Sentry / Bugsnag paid tiers — use Workers Analytics Engine + `console.error` log drain.
- No Twilio SMS — defer parent SMS to a later phase if needed (Clerk supports email one-time-codes for free).
- No Mux / api.video / Cloudflare Stream (paid) — self-hosted HLS only.
- No Datadog / New Relic — Workers Analytics Engine.
- No Figma / paid design tool — we use Noto Sans Bengali + Hind Siliguri directly.

---

## 18b. YouTube as a free video / live backend

> **Pattern:** teacher uploads a video to YouTube as **Unlisted**, then pastes the URL into InsideJibon. We embed the YouTube IFrame Player on the lesson page. **No YouTube Data API key is required** — `youtube-nocookie.com` embeds work without API keys, and our backend never calls any paid endpoint.

| Capability | How we get it free | Notes |
|---|---|---|
| VOD hosting + global CDN + adaptive bitrate | YouTube **Unlisted** upload | Unlisted = not searchable but anyone with the link can watch. Set the visibility to "Unlisted" — not "Private" — so the embed can resolve. |
| Mobile playback (iOS Safari + Android Chrome) | YouTube IFrame Player (auto-handled) | No app needed. |
| Auto-captions (English default) | YouTube's built-in ASR | Free. We can fetch via a worker that uses the public `youtube-transcript` package or scrapes the timedtext endpoint — no API key. |
| Bangla captions | YouTube's auto-captions if the uploader publishes the video with Bangla audio, **or** the teacher uploads a `.srt` (free, manual) | For R8, if a lesson has no Bangla captions, the AI tutor uses English captions + a translation hop (still free via Workers AI free tier). |
| Live classes + chat | YouTube **Unlisted Live** + YouTube **Live Chat** embed | R3 uses this path. The DO still owns presence, raise-hand, attendance, in-app Q&A. The video stage is the YouTube Live iframe; the chat rail is the YouTube Live Chat iframe (we hide YouTube's chat UI and replace with our own thread for moderation, but the embed is the underlying transport). |
| Replays | YouTube's VOD replay of the live stream (auto) | Same embed, just a different video id. |
| Anti-hotlink / privacy | Embed with `youtube-nocookie.com` (delays cookies until play) and `origin` restricted to our app domain | Workers Add a strict `Content-Security-Policy` allowlist for `frame-src https://www.youtube-nocookie.com https://www.youtube.com`. |
| Bandwidth cost | **Zero to InsideJibon.** YouTube pays for the bandwidth; we just embed. | This single trick saves the project potentially thousands of dollars/month if traffic grows. |

### What YouTube Unlisted is *not*

- **Not searchable** on google.com or youtube.com. Only people with the link (or embed) can watch. This is fine for an enrollment-gated edtech platform.
- **Not a substitute for true DRM** — anyone with the URL can reshare. For Bangladeshi edtech (low piracy incentive, free-tier commitment), this is acceptable. R9 does **not** attempt Widevine / FairPlay.
- **Not a substitute for our own CDN for assets** — we still use R2 for thumbnails, PDFs, profile images, certificates, proctoring clips (see §2).

### What changes in our code

- `lessons.video_provider` enum becomes `'youtube' | 'r2_hls' | 'external'`. Default `'youtube'`.
- Teacher flow: paste a YouTube URL → we extract the video ID with a tiny regex → store it.
- Lesson player (R2): replace `hls.js` for the `youtube` provider with a `<YouTubeEmbed videoId poster autoplay />` component. **HLS player remains for the `r2_hls` provider** (premium / paid content where we want tokenized playback URLs).
- R8 tutor embeddings: read captions via the public `youtube-transcript` package (or a Worker-side scraper of the `timedtext` endpoint) — no API key, no quota, fully free.
- R3 live class: the in-room "stage" is a YouTube Live iframe when the session is configured `video_provider='youtube_live'` (default). The DO still owns presence + raise-hand + attendance.
- CSP updates: add `frame-src https://www.youtube-nocookie.com https://www.youtube.com` and `script-src` allowance for the YouTube IFrame API script (`https://www.youtube.com/iframe_api`).

### What stays the same

- R0 security headers (CSP/HSTS) — unchanged, just extended.
- R6 bKash payments — unchanged.
- R7 parent digest emails — unchanged.
- R9 proctoring — unchanged. (Proctoring webcam uploads still go to R2.)
- R5 gamification, R4 Q&A — unchanged.

### When self-hosted HLS still makes sense

- A teacher uploads a video they **do not** want on YouTube at all (e.g. a coaching brand concern). They can still use the `r2_hls` path (free ffmpeg → R2 → hls.js). We don't take this path away; we just make YouTube the default.

---

## 19. Alert thresholds (free)

| Service | Threshold |
|---|---|
| Workers requests | 70,000 / day |
| Workers CPU avg | 6 ms |
| KV writes | 800 / day |
| DO requests | 70,000 / day |
| R2 storage | 8 GB |
| Neon storage | 0.4 GiB |
| Neon compute hours | 150 / month |
| Clerk MAU | 7,000 |
| Workers AI Neurons | 7,000 / day |
| Email Service sends | 70 / day |
