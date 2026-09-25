# Remaster Phase R2 — Edge Caching, R2 Custom Domain & Video (YouTube-First)

> **Phase:** R2 (after R0; parallel-friendly with R1 visually — but technically blocks R3 because the live class needs the video stage).
> **Theme:** Treat Cloudflare as a real CDN: cache the marketing surface, public catalog, and course detail; serve static assets off-Worker; stream videos via **YouTube Unlisted embeds as the free, default, $0-cost path** (no API key, no API quota, no bandwidth cost) with **self-hosted HLS kept as the optional premium/brand-controlled fallback**.
> **Cost commitment:** **$0 paid spend.** YouTube Unlisted + `youtube-nocookie.com` iframe = free video backend. ffmpeg self-hosted HLS only used if a teacher declines YouTube.

Read `AGENTS.md`, `docs/MASTER_ROADMAP.md`, `docs/MASTER_REMASTER.md`, and [`FREE-TIER-REFERENCE.md`](./FREE-TIER-REFERENCE.md) first (especially §18b — YouTube as a free video backend).

---

## 1. Objectives

1. Stand up **R2 public bucket** (`insidejibon-public`) with a public custom domain (e.g. `cdn.insidejibon.com.bd`). All non-sensitive static assets are served directly from R2 — not from the Worker.
2. Move *all* image thumbnails (course cards, lesson thumbnails, og images) to R2 with on-the-fly WebP variants via Cloudflare Image Resizing (or pre-baked on upload).
3. Edge-cache every public page via the Cache API with deterministic tags; ship invalidation hooks from teacher/admin actions.
4. Replace the current plain MP4 video with a **video provider enum**:
   - **`youtube`** (default; $0): teacher pastes a YouTube Unlisted URL → we extract the video id → lesson page embeds `youtube-nocookie.com` iframe (adaptive bitrate, captions, mobile playback — all free, all on YouTube's CDN).
   - **`r2_hls`** (fallback for premium/brand-controlled): VOD → Actions cron ffmpeg transcode → HLS variants + segments in R2 → `hls.js` plays. Used when a teacher explicitly opts out of YouTube.
   - **`external`**: legacy direct MP4 URL — kept for backward compat.
5. Stop serving big files through the Worker for non-authenticated content.
6. Add per-asset metrics: total bytes, cache hit rate, top assets (Workers Analytics Engine — free).

---

## 2. Data Model Changes

### Migration `0002_remaster_r2_video.sql`

```sql
-- Lesson video asset references — YouTube is the default $0 path.
-- 'r2_hls' is the optional self-hosted fallback for teachers who decline YouTube.
ALTER TABLE lessons
  ADD COLUMN video_provider       TEXT NOT NULL DEFAULT 'youtube', -- 'youtube' | 'r2_hls' | 'external'
  ADD COLUMN youtube_video_id     TEXT,                              -- e.g. 'dQw4w9WgXcQ' (last path segment of any youtube.com / youtu.be URL)
  ADD COLUMN youtube_caption_lang TEXT,                              -- 'en'|'bn'|null  (primary auto-caption lang, used by R8 tutor)
  ADD COLUMN video_asset_id       TEXT,                              -- R2 manifest key (when provider='r2_hls')
  ADD COLUMN video_duration_s     INTEGER,
  ADD COLUMN video_thumbnail_key  TEXT,                              -- R2 public key for thumbnail
  ADD COLUMN video_renditions     JSONB NOT NULL DEFAULT '[]'::jsonb; -- only for r2_hls

CREATE INDEX IF NOT EXISTS lessons_video_kind_idx ON lessons (video_kind);

-- Public assets audit (anything in PUBLIC_BUCKET must be represented here)
CREATE TABLE IF NOT EXISTS public_assets (
  id            BIGSERIAL PRIMARY KEY,
  storage_key   TEXT NOT NULL UNIQUE,
  mime_type     TEXT NOT NULL,
  byte_size     BIGINT NOT NULL,
  owner_kind    TEXT NOT NULL,    -- 'system' | 'course' | 'user'
  owner_id      TEXT,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS public_assets_owner_idx ON public_assets (owner_kind, owner_id);
CREATE INDEX IF NOT EXISTS public_assets_tags_idx ON public_assets USING GIN (tags);

-- Audit/cache tags we'll set per page invalidation. Stored as JSONB to keep flexible.
CREATE TABLE IF NOT EXISTS cache_invalidations (
  id           BIGSERIAL PRIMARY KEY,
  tag          TEXT NOT NULL,
  reason       TEXT,
  actor_id     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cache_invalidations_tag_idx ON cache_invalidations (tag, created_at DESC);
```

`lessons.videoUrl` is kept for backward compat. New code reads `videoAssetId` first.

---

## 3. Service Layer

### 3.1 `src/lib/storage/public.ts`
- `uploadPublicAsset(key, bytes, mime)` — wraps R2 + inserts `public_assets` row.
- `deletePublicAsset(key)` — R2 delete + cascade row.
- `publicUrl(key, { variant })` — returns `${CDN_BASE}/${key}`; variants `original`, `webp-480`, `webp-720`, `webp-1080` resolved via Cloudflare Image Resizing (`/cdn-cgi/image/...`).

### 3.2 `src/lib/storage/video.ts` — **self-hosted HLS**
- `enqueueHlsTranscode({ lessonId, sourceR2Key, renditions })` — produces a `TRANSCODE_QUEUE` job (R2 `EMBEDDINGS_QUEUE` reused, since free quota is shared).
- `runHlsTranscodeJob({ sourceR2Key, targetPrefix })` — **two execution paths**, pick one per environment:
  - **GitHub Actions cron path (default):** worker hands the job off via `EMBEDDINGS_QUEUE`; an Actions workflow polls the queue (or a `cron` trigger) and runs `ffmpeg` against the source (downloads from R2 public URL, transcodes to 480p + 720p HLS, uploads segments + master `.m3u8` back to R2 under `videos/<lessonId>/...`). Free tier: 2,000 minutes/month. **Verified inside CI before merge.**
  - **In-Worker ffmpeg.wasm path (fallback for short clips):** `@ffmpeg/ffmpeg` running inside the Worker. **Only safe** when total WASM cold-start + per-frame CPU stays inside the Workers Free plan 10ms CPU budget. Acceptable for ≤30s clips; for long lessons the Actions path is mandatory.
- `getHlsManifestUrl(lessonId)` — returns `${CDN_BASE}/videos/<lessonId>/master.m3u8` (public for free lessons; **signed** for paid lessons — see §6).
- `deleteHlsAssets(lessonId)` — R2 delete of prefix.
- `probeVideoDuration(r2Key)` — uses `@ffprobe-installer/ffprobe` inside Actions or a Worker call; stored in `lessons.video_duration_s`.

### 3.3 `src/services/lessons/video.ts`
- `setLessonVideo(lessonId, { kind, assetId, externalUrl, ... })` — enforces ownership via `lessons → module → course → teacherId`. New code defaults to `kind='r2_hls'`.
- `getLessonVideoForStudent(lessonId, studentId)` — entitlement check:
  - Free lesson: returns `{ kind: 'r2_hls', manifestUrl: publicManifestUrl }`.
  - Paid lesson: returns `{ kind: 'r2_hls', manifestUrl: signedManifestUrl(ttl=4h) }`.
  - External: returns `{ kind: 'external', url }` (existing behavior).

### 3.4 `src/services/cache/invalidate.ts`
- Helpers `invalidateTags([...tags])`:
  - Push `caches.default.delete()` for each tagged cache key.
  - Insert audit row in `cache_invalidations`.
  - Emits a `cache.purge` worker-to-worker event so multi-region replicas stay consistent (Queues producer `EXPORT_QUEUE` if budget allows).

### 3.5 Cache key conventions (under `src/lib/cloudflare/cache.ts`)
- Use `URL + Vary: Cookie(role)` is wrong — we vary by `cf-cache-tag` only.
- Tag list: `marketing:landing`, `catalog:list`, `course:{slug}`, `teacher:{handle}`, `asset:{key}`.
- TTLs (TTL / SWR):
  - marketing landing: 60s / 10min
  - catalog list: 60s / 10min
  - course detail: 120s / 30min
  - teacher public: 300s / 1h
  - assets: 7d / 30d (immutable hashed URLs)

---

## 4. UI/UX Changes

### 4.1 Lesson player (`src/components/student/learning/lesson-player.tsx`)
The player is now a **router** based on `lesson.video_provider`:

- **`youtube`** (default): `<YouTubeEmbed videoId={youtube_video_id} onProgress={…} />` — wraps `youtube-nocookie.com` iframe via the YouTube IFrame Player API. Free. Adaptive bitrate, captions, mobile playback, PiP, speed control all come from YouTube's native controls.
- **`r2_hls`**: `<HlsPlayer src={signedManifestUrl} />` using `hls.js`. Kept for premium/brand-controlled content where YouTube is not desired.
- **`external`**: simple `<video src={externalUrl} controls />`. Legacy fallback.

For the YouTube path, our code uses the YouTube IFrame Player API (`https://www.youtube.com/iframe_api`) to listen for `onStateChange` events and post progress to `lesson_progress` (debounced 5s, on pause, on seek beyond 90%). **No YouTube Data API key needed.**

### 4.2 Course detail page
Embed a 20-second silent YouTube preview by appending `?start=0&end=20` (or using the IFrame Player's `playerVars` `{ start: 0, end: 20 }`) — free, no auth required to load the embed.

### 4.3 Teacher upload flow (`/teacher/builder/lessons/[lessonId]/video`)
- **Default flow (YouTube):** a simple input "Paste a YouTube Unlisted URL". We extract the video id with a small regex (`(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})`) — the canonical 11-char video id. Validate that the URL is reachable (HEAD via Worker; check `200 OK`); reject if the video is "Private" (unlisted is fine).
- **Opt-in fallback (r2_hls):** for teachers who decline YouTube: drag-and-drop a video file → uploads directly to R2 `MATERIALS_BUCKET` (multipart) via the R0 streaming route. Once upload finishes, an `EMBEDDINGS_QUEUE` job `hls.transcode` is enqueued; teacher sees a "Processing — usually under 5 minutes" banner. The Actions cron worker runs `ffmpeg` and uploads back to R2 `PUBLIC_BUCKET`.
- **External URL:** kept as legacy.

### 4.4 Marketing/asset management
- Teachers pick a thumbnail from their uploaded assets (gallery modal) — reuse `public_assets` keyed by `owner_kind='course'`. For YouTube lessons, we **also** let teachers "Pull from YouTube" — the IFrame Player API exposes `getAvailableQualityLevels()` and the highest-quality thumbnail URL; we copy that to R2 for our own thumbnails.

---

## 5. New Infra Bindings

`wrangler.jsonc` additions:

```jsonc
{
  "r2_buckets": [
    { "binding": "MATERIALS_BUCKET", "bucket_name": "insidejibon-materials" },
    { "binding": "PUBLIC_BUCKET",    "bucket_name": "insidejibon-public"   }
  ]
}
```

Plus a Cloudflare Image Resizing zone-level transform (free) — enabled by an operator in the Cloudflare dashboard.

We **do not** create a Cloudflare Stream account. **We do not** set `CF_STREAM_TOKEN`. R3 will reuse the Actions ffmpeg path for live recording transcoding.

---

## 6. Security & Performance Considerations

- **Always URL-sign playback manifests for paid content** (default TTL 4 hours); free lesson manifests are public via the public bucket (no signature).
- **Never expose R2 raw keys** in HTML — server component fetches the lesson, computes the manifest URL, hands the client only that.
- **Cache the signed manifest URL itself?** No. It's per-user; mark `Cache-Control: private, no-store`.
- **CDN-served assets** are public; do not put copyrighted teacher-uploaded PDFs in `PUBLIC_BUCKET` — those stay in `MATERIALS_BUCKET` and use the R0 signed-URL path for ≥5MB.
- **CSP** must include `media-src` allowlist for our custom CDN domain (e.g. `https://cdn.insidejibon.com.bd`) and `blob:` (for MediaRecorder in R3 / R9). Updated in R0 §6.
- **Image Resizing** is included on the free plan up to a generous count — keep three sizes max; aggressively cache responses.
- **HLS segment URLs**: signed at the manifest level when content is paid; free lessons expose the master playlist directly. **DO NOT** embed a long-lived Cloudflare API token; we use R2's per-object HMAC signature (R0 signed-URL helper).

---

## 7. i18n Keys Required (R2)

- `learning.player.play`, `pause`, `mute`, `unmute`, `fullscreen`, `pip`, `speed`, `quality`
- `learning.player.shortcuts` — list rendering for the `?` modal
- `learning.player.errors.network`, `learning.player.errors.unsupported`
- `learning.upload.processing`, `upload.failed`, `upload.success`
- `asset.variant.original`, `webp-480`, `webp-720`, `webp-1080`

---

## 8. Performance Targets

- Marketing `cache-status: HIT` ≥ 95% during normal load.
- Course detail: TTFB P75 ≤ 80ms (edge hit), ≤ 400ms (edge miss).
- Lesson video Time-to-First-Frame: ≤ 1.2s on a 4G mobile (test with throttled DevTools).
- Total bytes per dashboard first paint: ≤ 220KB (HTML+CSS+JS).

---

## 9. Verification Checklist

1. `npm run check:i18n`, `npx tsc --noEmit`, `npm run lint`, `npm run build` green.
2. `npm run preview` locally; load `/` twice; second request shows `cf-cache-status: HIT`.
3. Update a course title in admin; verify next GET of that URL is fresh within 60s.
4. Teacher pastes a YouTube Unlisted URL → video id is extracted + validated → lesson page plays inside `youtube-nocookie.com` iframe. **No API key required. No Worker egress cost.**
5. (Optional `r2_hls` path) Upload a 200MB MP4 via teacher → enqueued to `EMBEDDINGS_QUEUE` → Actions cron (or local ffmpeg.wasm in dev) produces `videos/<lessonId>/master.m3u8` + segments in R2 → lesson page plays HLS via `hls.js`. **No Stream account used.**
6. WebP variants: thumbnail URLs return real WebP bytes (verify Content-Type).
7. YouTube playback tested on Chrome Desktop, Android Chrome (mid-range), iOS Safari.
8. Verify Worker invocation count drops ≥ 40% on marketing routes (compared to pre-R2 baseline via Workers Analytics).
9. Confirm CSP allows `frame-src https://www.youtube-nocookie.com https://www.youtube.com` and `script-src` allows `https://www.youtube.com/iframe_api`.
10. Worker egress for the YouTube embed path is **zero** (R2 metrics confirm no big egress spike); all video bandwidth goes to YouTube's CDN.
11. YouTube auto-captions reachable via the public `timedtext` endpoint for R8 use (smoke test the embed after).

---

## 10. Copy-Paste Prompt

```markdown
# Phase R2 — Edge Caching, R2 Custom Domain & Video (YouTube-First)

Read `AGENTS.md`, `docs/MASTER_READMAP.md`, `docs/MASTER_REMASTER.md`, and `docs/FREE-TIER-REFERENCE.md` first (especially §18b).

## Tasks
1. Create R2 bucket `insidejibon-public` and bind it in `wrangler.jsonc`.
2. Configure R2 public custom domain `cdn.insidejibon.com.bd` via Cloudflare dashboard (operator action).
3. Enable Cloudflare Image Resizing at zone level (operator action).
4. Run migration `0002_remaster_r2_video.sql`.
5. Add `src/lib/storage/public.ts` per §3.1.
6. Build the YouTube id extraction helper `src/lib/video/youtube.ts` — pure regex + a server-side `validateYoutubeId` that HEADs `https://www.youtube.com/oembed?url=<>&format=json` (no API key needed; oembed is public).
7. Build the lesson-player router at `src/components/student/learning/lesson-player.tsx` — dispatches to `<YouTubeEmbed>` / `<HlsPlayer>` / `<video>` based on `lesson.video_provider`.
8. Add `src/services/lessons/video.ts` updates per §3.3.
9. Build teacher "Paste YouTube URL" flow per §4.3 (default); keep the r2_hls multipart-upload path as the opt-in fallback for teachers who decline YouTube.
10. Apply `edgeCache` (from R0) to marketing routes + catalog + course detail; add invalidation hooks per §3.4.
11. Update CSP (R0) for `frame-src https://www.youtube-nocookie.com https://www.youtube.com` and `script-src https://www.youtube.com/iframe_api`.
12. Add i18n keys per §7.
13. Run §9 verification checklist.
14. Commit + push.
```
