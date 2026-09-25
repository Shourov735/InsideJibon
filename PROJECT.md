# Project: InsideJibon Remaster Phase R2 — Edge Caching, R2 Custom Domain & YouTube-First Video

## Architecture
- **Framework & Deployment**: Next.js 16 App Router on Cloudflare Workers via OpenNext.
- **Database**: Neon PostgreSQL + Drizzle ORM using the HTTP driver (`neon-http`), no multi-statement transactions, atomic operations.
- **Video Strategy**: YouTube Unlisted embeds via `youtube-nocookie.com` as the default $0-cost video pipeline (no API keys, no quota, zero egress). Self-hosted HLS (`r2_hls`) via `hls.js` as an opt-in fallback for teachers declining YouTube. Direct HTML5 video (`external`) as legacy fallback.
- **Storage & CDN**: Non-sensitive public assets served off-Worker from Cloudflare R2 (`insidejibon-public`) under custom CDN domain `cdn.insidejibon.com.bd` with on-the-fly Cloudflare Image Resizing WebP variants.
- **Edge Caching**: Cloudflare Cache API (`caches.default`) with deterministic tags (`marketing:landing`, `catalog:list`, `course:{slug}`, etc.) and automated invalidation triggers on content mutations with `cache_invalidations` audit tracking.
- **Security & Auth**: Clerk manual server-side JWT verification. Tight CSP headers in `next.config.ts` allowing YouTube iframes, player scripts (`s.ytimg.com`), and CDN media.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Lessons Schema Extension | Add `video_provider` (default 'youtube'), `youtube_video_id`, `youtube_caption_lang`, `video_asset_id`, `video_duration_s`, `video_thumbnail_key`, `video_renditions` (jsonb), and `lessons_video_provider_idx` | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Public Assets Audit Table | `public_assets` Drizzle schema with `storage_key` unique, owner indices, and GIN tags index | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Cache Invalidation Audit Table | `cache_invalidations` Drizzle schema with descending tag index | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Drizzle Migration 0016 | Generate and record `0016_remaster_r2_video.sql` (journal idx 16) | M1 | ORIGINAL_REQUEST §R1, Survey 1 |
| 5 | Public R2 Storage Helper | `src/lib/storage/public.ts` wrapping R2 `PUBLIC_BUCKET` with `uploadPublicAsset`, `deletePublicAsset`, and `publicUrl` with WebP resizing variants | M1 | ORIGINAL_REQUEST §R6 |
| 6 | YouTube Video ID Extractor | Pure regex extracting 11-char ID from all URL shapes (watch, short, embed, live, raw ID) | M2 | ORIGINAL_REQUEST §R2 |
| 7 | YouTube oEmbed Validation Service | Server-side reachability check against `https://www.youtube.com/oembed` (no API key, handling 200 vs 401/403/404, metadata extraction) | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Lesson Video Service | `src/services/lessons/video.ts` for teacher video configuration & student authorized video descriptor resolution | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Cloudflare Cache API Helper | `src/lib/cloudflare/cache.ts` runtime detection, dev/test safety, RSC key disambiguation, session cookie bypass | M3 | ORIGINAL_REQUEST §R5 |
| 10 | Cache Invalidation Service | `src/services/cache/invalidate.ts` with `invalidateTags()`, local Cache API purge, and audit logging | M3 | ORIGINAL_REQUEST §R5 |
| 11 | Cache Invalidation Triggers | Wire invalidations into course, lesson, module, and teacher actions | M3 | ORIGINAL_REQUEST §R5 |
| 12 | Content Security Policy (CSP) Updates | Add `s.ytimg.com` to `script-src`, `cdn.insidejibon.com.bd` to `media-src`/`connect-src`, image remote patterns | M3 | ORIGINAL_REQUEST §R6 |
| 13 | Student Video Player Router | `src/components/student/learning/lesson-player.tsx` routing across 'youtube', 'r2_hls', and 'external' | M4 | ORIGINAL_REQUEST §R3 |
| 14 | YouTube IFrame Player & Progress Sync | `youtube-nocookie.com` embed with IFrame API, debounced 5s position sync, pause save, >90% auto-complete | M4 | ORIGINAL_REQUEST §R3 |
| 15 | HLS Fallback Player | `hls.js` dynamic import player with signed manifest support for paid lessons | M4 | ORIGINAL_REQUEST §R3 |
| 16 | Course Preview Video | 20-second silent YouTube preview embed for course detail pages | M4 | ORIGINAL_REQUEST §R3 |
| 17 | Teacher Builder YouTube Flow | Default "Paste YouTube Unlisted URL" input with debounced oEmbed validation and title auto-fill | M5 | ORIGINAL_REQUEST §R4 |
| 18 | Teacher Builder R2 HLS Fallback | Opt-in multipart video upload for teachers declining YouTube | M5 | ORIGINAL_REQUEST §R4 |
| 19 | Thumbnail Selector | Toggle between YouTube thumbnail and uploaded public asset | M5 | ORIGINAL_REQUEST §R4 |
| 20 | i18n Localization (45 keys) | Full en/bn parity for `learning.player.*`, `learning.upload.*`, `asset.variant.*`, `teacher.builder.*` | M5 | ORIGINAL_REQUEST §R7 |
| 21 | E2E Testing Suite (Tiers 1-4) | Opaque-box test suite verifying all 20 features with >=5 test cases per feature | M6 | ORIGINAL_REQUEST §Acceptance |
| 22 | Adversarial Hardening (Tier 5) | White-box adversarial testing for edge cases and coverage hardening | M6 | Project Pattern |
| 23 | Quality Gates & Production Readiness | Verification of `npm run check:i18n`, `npx tsc --noEmit`, `npm run lint`, `npm run build` | M6 | ORIGINAL_REQUEST §Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Schema, Migration & Public Storage | Features 1, 2, 3, 4, 5 | none | PLANNED |
| 2 | M2: YouTube Utilities & Video Service | Features 6, 7, 8 | M1 | PLANNED |
| 3 | M3: Edge Caching & CSP Hardening | Features 9, 10, 11, 12 | M1 | PLANNED |
| 4 | M4: Student Video Player Router | Features 13, 14, 15, 16 | M2 | PLANNED |
| 5 | M5: Teacher Builder & i18n Localization | Features 17, 18, 19, 20 | M1, M2 | PLANNED |
| 6 | M6: E2E Testing & Quality Gates Pass | Features 21, 22, 23 | M1, M2, M3, M4, M5 | PLANNED |

## Interface Contracts
### Video Domain (`src/types/video.ts` & `src/lib/video/youtube.ts`)
- `extractYouTubeVideoId(url: string): string | null`
- `validateYouTubeVideo(videoIdOrUrl: string): Promise<{ valid: boolean; title?: string; authorName?: string; thumbnailUrl?: string; error?: string }>`
- `type VideoProvider = 'youtube' | 'r2_hls' | 'external'`
- `type VideoDescriptor = { provider: VideoProvider; videoId?: string; manifestUrl?: string; videoUrl?: string; durationS?: number; thumbnailUrl?: string }`

### Storage Domain (`src/lib/storage/public.ts`)
- `uploadPublicAsset(key: string, data: ArrayBuffer | Uint8Array, mimeType: string, owner?: { kind: string; id: string }, tags?: string[]): Promise<string>`
- `deletePublicAsset(key: string): Promise<boolean>`
- `publicUrl(key: string, options?: { variant?: 'original' | 'webp-480' | 'webp-720' | 'webp-1080' }): string`

### Cache Domain (`src/services/cache/invalidate.ts` & `src/lib/cloudflare/cache.ts`)
- `invalidateTags(tags: string[], options?: { reason?: string; actorId?: string }): Promise<void>`
- `cacheTags`: `marketing:landing`, `catalog:list`, `course:{slug}`, `teacher:{handle}`, `asset:{key}`

## Code Layout
- `src/db/schema/courses.ts`: Lessons table schema additions
- `src/db/schema/public-assets.ts`: Public assets audit table
- `src/db/schema/cache.ts`: Cache invalidations audit table
- `src/db/migrations/0016_remaster_r2_video.sql`: Drizzle migration
- `src/lib/video/youtube.ts`: YouTube URL parser & oEmbed validation
- `src/lib/storage/public.ts`: Public R2 asset helper & WebP URL generator
- `src/lib/cloudflare/cache.ts`: Edge Cache API utilities & key resolvers
- `src/services/lessons/video.ts`: Lesson video management & student video resolution
- `src/services/cache/invalidate.ts`: Tag invalidation service & audit logger
- `src/components/student/learning/lesson-player.tsx`: Video player router
- `src/components/student/learning/youtube-embed.tsx`: YouTube IFrame API component
- `src/components/student/learning/hls-player.tsx`: HLS player component
- `src/components/teacher/builder/lesson-video-editor.tsx`: Teacher video builder component
- `src/components/public/course-preview-video.tsx`: 20s course preview player
- `next.config.ts`: CSP headers & image remote patterns
- `src/i18n/dictionaries/en.ts` & `bn.ts`: Symmetrical bilingual dictionary entries
