# Test Infrastructure Specification: Remaster Phase R2

**Project:** InsideJibon (Remaster Phase R2: Edge Caching, R2 Custom Domain & YouTube-First Video)  
**Location:** `/home/shourov/Projects/insidejibon/TEST_INFRA.md`  
**Test Suite Directory:** `/home/shourov/Projects/insidejibon/tests/e2e/r2/`  
**Author:** E2E Test Suite Designer & Writer (`teamwork_preview_test_writer_e2e_1`)  
**Status:** COMPLETE & VERIFIED (233/233 Passing Tests)

---

## 1. Overview & Objectives

Remaster Phase R2 establishes YouTube Unlisted embeds as the default $0-cost video pipeline for InsideJibon, provides self-hosted HLS (`r2_hls`) as an opt-in fallback, moves public assets off-Worker to Cloudflare R2 under `cdn.insidejibon.com.bd`, and edge-caches public read-heavy surfaces with deterministic tag-based invalidations.

This test infrastructure implements an opaque-box E2E test suite adhering strictly to the **4-Tier Test Methodology**:
1. **Tier 1: Feature Coverage** — Minimum 5 test cases per feature across all 20 features (100 tests).
2. **Tier 2: Boundary & Corner Cases** — Minimum 5 boundary/edge test cases per feature across all 20 features (100 tests).
3. **Tier 3: Cross-Feature Combinations** — Pairwise integration tests validating interoperability across modules (28 tests).
4. **Tier 4: Real-World Application Scenarios** — Complete end-to-end user journeys (5 tests).

Total Test Suite Size: **233 automated test cases**.

---

## 2. Test Execution & CLI Commands

The test suite runs natively on Node.js 24 (`v24.18.0`) using the built-in `node:test` runner with `--experimental-strip-types`, requiring **zero additional npm packages** and incurring **zero paid subscription or third-party SaaS costs**.

### 2.1 Unified Test Runner (Recommended)
Runs all 4 tiers in sequence, aggregates results, and displays a formatted summary table:

```bash
node --conditions=react-server --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types tests/e2e/r2/runner.ts
```

### 2.2 Running Individual Tiers

#### Tier 1: Feature Coverage (100 tests)
```bash
node --conditions=react-server --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types tests/e2e/r2/tier1-features.test.ts
```

#### Tier 2: Boundary & Corner Cases (100 tests)
```bash
node --conditions=react-server --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types tests/e2e/r2/tier2-boundaries.test.ts
```

#### Tier 3: Cross-Feature Pairwise Combinations (28 tests)
```bash
node --conditions=react-server --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types tests/e2e/r2/tier3-combinations.test.ts
```

#### Tier 4: Real-World Application Scenarios (5 tests)
```bash
node --conditions=react-server --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types tests/e2e/r2/tier4-scenarios.test.ts
```

#### Running All Tests in Parallel with Node Test Runner:
```bash
node --conditions=react-server --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types tests/e2e/r2/tier*.test.ts
```

---

## 3. Directory Layout & Test File Structure

```
tests/e2e/r2/
├── helpers/
│   ├── oembed-mock.ts           # Hermetic YouTube oEmbed mock server & fixtures
│   ├── contracts.ts             # Interface contracts, canonical regex, and validators
│   └── test-fixtures.ts         # Test vectors for URLs, tags, CSP, and progress
├── tier1-features.test.ts       # 100 tests covering Features 1-20
├── tier2-boundaries.test.ts     # 100 boundary & corner tests for Features 1-20
├── tier3-combinations.test.ts   # 28 pairwise combination tests across features
├── tier4-scenarios.test.ts      # 5 real-world application journey scenarios
└── runner.ts                    # Orchestration test runner and summary reporter
```

---

## 4. Feature Coverage Matrix (Tiers 1 & 2)

| # | Feature Name | Tier 1 Tests | Tier 2 Tests | Total Tests |
|---|--------------|:------------:|:------------:|:-----------:|
| 1 | Lessons Schema Extension | 5 (F01-1..5) | 5 (F01-B1..B5) | 10 |
| 2 | Public Assets Audit Table | 5 (F02-1..5) | 5 (F02-B1..B5) | 10 |
| 3 | Cache Invalidation Audit Table | 5 (F03-1..5) | 5 (F03-B1..B5) | 10 |
| 4 | Drizzle Migration 0016 | 5 (F04-1..5) | 5 (F04-B1..B5) | 10 |
| 5 | Public R2 Storage Helper | 5 (F05-1..5) | 5 (F05-B1..B5) | 10 |
| 6 | YouTube Video ID Extractor | 5 (F06-1..5) | 5 (F06-B1..B5) | 10 |
| 7 | YouTube oEmbed Validation Service | 5 (F07-1..5) | 5 (F07-B1..B5) | 10 |
| 8 | Lesson Video Service | 5 (F08-1..5) | 5 (F08-B1..B5) | 10 |
| 9 | Cloudflare Cache API Helper | 5 (F09-1..5) | 5 (F09-B1..B5) | 10 |
| 10 | Cache Invalidation Service | 5 (F10-1..5) | 5 (F10-B1..B5) | 10 |
| 11 | Cache Invalidation Triggers | 5 (F11-1..5) | 5 (F11-B1..B5) | 10 |
| 12 | Content Security Policy (CSP) Updates | 5 (F12-1..5) | 5 (F12-B1..B5) | 10 |
| 13 | Student Video Player Router | 5 (F13-1..5) | 5 (F13-B1..B5) | 10 |
| 14 | YouTube IFrame Player & Progress Sync | 5 (F14-1..5) | 5 (F14-B1..B5) | 10 |
| 15 | HLS Fallback Player | 5 (F15-1..5) | 5 (F15-B1..B5) | 10 |
| 16 | Course Preview Video | 5 (F16-1..5) | 5 (F16-B1..B5) | 10 |
| 17 | Teacher Builder YouTube Flow | 5 (F17-1..5) | 5 (F17-B1..B5) | 10 |
| 18 | Teacher Builder R2 HLS Fallback | 5 (F18-1..5) | 5 (F18-B1..B5) | 10 |
| 19 | Thumbnail Selector | 5 (F19-1..5) | 5 (F19-B1..B5) | 10 |
| 20 | i18n Localization (45 keys) | 5 (F20-1..5) | 5 (F20-B1..B5) | 10 |
| **Total** | | **100** | **100** | **200** |

---

## 5. Pairwise Combinations Matrix (Tier 3)

The 28 pairwise combination tests verify cross-module interface boundaries:
- **P01 [F06 + F07]**: Extracted YouTube ID pipes into oEmbed reachability check.
- **P02 [F07 + F17]**: oEmbed 200 response triggers title and thumbnail auto-fill in Teacher Builder.
- **P03 [F07 + F17]**: Private video response (401/403) triggers teacher warning without saving invalid lesson.
- **P04 [F17 + F08]**: Teacher Builder form submission transfers validated YouTube ID into Lesson Video Service payload.
- **P05 [F08 + F01]**: Lesson Video Service populates extended `lessons` table schema columns.
- **P06 [F08 + F11]**: Lesson video update triggers course cache invalidation (`course:{slug}`).
- **P07 [F11 + F10]**: Invalidation triggers invoke `invalidateTags` with exact tag arrays.
- **P08 [F10 + F03]**: Cache Invalidation Service writes audit records to `cache_invalidations`.
- **P09 [F10 + F09]**: Cache Invalidation Service purges matched URLs from Edge Cache.
- **P10 [F09 + F12]**: Edge cached pages retain strictly valid CSP headers with zero security leakage.
- **P11 [F12 + F14]**: CSP allows YouTube IFrame API (`s.ytimg.com`) and nocookie iframe (`youtube-nocookie.com`).
- **P12 [F12 + F05]**: CSP permits media requests and connect requests to `cdn.insidejibon.com.bd`.
- **P13 [F05 + F02]**: Public R2 asset upload writes audit entry to `public_assets`.
- **P14 [F05 + F19]**: Custom uploaded thumbnail generates WebP resizing variant URL (`webp-720`).
- **P15 [F19 + F08]**: Thumbnail selection stores key in `lessons.video_thumbnail_key`.
- **P16 [F08 + F13]**: Student Learn page requests video descriptor and routes to Student Video Player.
- **P17 [F13 + F14]**: Player router selects YouTube player and starts progress sync.
- **P18 [F14 + F08]**: YouTube playback reaching >90% marks lesson complete in learning progress.
- **P19 [F18 + F05]**: Teacher opt-in R2 HLS upload stores manifest in public R2 bucket.
- **P20 [F18 + F08]**: Teacher R2 HLS setup configures `video_provider = 'r2_hls'` with renditions.
- **P21 [F08 + F15]**: Student Video Player routes 'r2_hls' to HLS fallback player with signed URL.
- **P22 [F15 + F12]**: HLS player media requests pass CSP `media-src` without violation.
- **P23 [F16 + F06]**: Course Preview Video extracts video ID and renders 20s looping embed.
- **P24 [F20 + F13]**: Student Video Player displays localized player controls in en & bn.
- **P25 [F20 + F17]**: Teacher Builder displays localized validation messages in en & bn.
- **P26 [F04 + F01]**: Drizzle migration 0016 successfully establishes lessons schema columns.
- **P27 [F04 + F02]**: Drizzle migration 0016 successfully establishes public_assets schema.
- **P28 [F04 + F03]**: Drizzle migration 0016 successfully establishes cache_invalidations schema.

---

## 6. Real-World Application Scenarios (Tier 4)

- **Scenario 1: Teacher YouTube Unlisted Workflow to Student Completion**
  Full lifecycle: Teacher pastes URL -> oEmbed metadata resolves -> title auto-fills -> lesson saved -> course cache invalidated -> enrolled student launches lesson -> YouTube nocookie embed mounts -> 5s progress debounces -> seek past 90% -> auto-completed.
- **Scenario 2: Opt-in Self-Hosted R2 HLS Fallback Workflow**
  Full lifecycle: Teacher opts out of YouTube -> multipart upload to R2 -> audit record created -> transcode renditions configured -> enrolled student streams via Hls.js -> signed manifest token verified.
- **Scenario 3: Edge Caching & Deterministic Tag Invalidation Workflow**
  Full lifecycle: Anonymous visitor caches `/courses` under `catalog:list` -> Teacher publishes new course -> cache invalidation purges edge entry -> audit log logged -> subsequent request served fresh.
- **Scenario 4: Full Bilingual Experience & State Preservation Workflow**
  Full lifecycle: Localization token parity checked -> Student switches locale between `en` and `bn` -> playback position and video caption preferences preserved.
- **Scenario 5: High-Performance Asset Delivery & CSP Compliance Workflow**
  Full lifecycle: Custom thumbnail upload -> R2 storage key generated -> WebP-480, 720, 1080 responsive srcset generated -> verified against strict CSP headers.

---

## 7. Authoritative Expected Output Derivation

All expected values in this test suite are derived directly from authoritative sources:
1. **YouTube URL Parsing**: Documented in `PROJECT.md § Interface Contracts` and Survey 2 observations:
   - Canonical Regex: `/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|live\/|(?:.*[?&])v=))([a-zA-Z0-9_-]{11})/i`
2. **YouTube oEmbed**: YouTube Public oEmbed Specification (`https://www.youtube.com/oembed?url=...&format=json`):
   - 200 OK: Valid public and unlisted videos
   - 401/403: Private videos
   - 404: Non-existent, malformed, or deleted videos
3. **Public Asset Delivery**: Cloudflare Image Resizing format:
   - Base CDN: `https://cdn.insidejibon.com.bd`
   - Transform: `/cdn-cgi/image/format=webp,width={width}/{key}`
4. **Edge Cache Tag Invalidation**: Cloudflare Cache API (`caches.default`):
   - Cache keys must separate RSC streams (`#__rsc__` or parameter preservation) from full document HTML.
   - Cache bypass when `__session` cookie is present.
5. **Content Security Policy**: W3C CSP Level 3 standard and `next.config.ts`:
   - `s.ytimg.com` in `script-src`
   - `cdn.insidejibon.com.bd` in `media-src` and `connect-src`
   - `youtube-nocookie.com` and `youtube.com` in `frame-src`
6. **i18n Localization**: `scripts/check-i18n.mjs` parity standard across 45 keys in `learning.player.*`, `learning.upload.*`, `asset.variant.*`, `teacher.builder.*`.

---

## 8. Quality Gates & Escalation Protocol

Before code is deployed to main, the following quality gates must pass:
1. `node --conditions=react-server --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types tests/e2e/r2/runner.ts` (All 233 tests pass)
2. `npm run check:i18n` (100% key parity between en.ts and bn.ts)
3. `npx tsc --noEmit` (0 TypeScript diagnostics)
4. `npm run lint` (0 ESLint errors)
5. `npm run build` (Clean Turbopack production build)

Implementation defects must be escalated to the implementing worker agents rather than patched in test code.
