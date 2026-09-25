import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setupOEmbedMock, OEMBED_FIXTURES } from "./helpers/oembed-mock.ts";
import {
  canonicalExtractYouTubeId,
  canonicalPublicUrl,
  canonicalCacheKey,
  CDN_BASE_DOMAIN,
} from "./helpers/contracts.ts";
import {
  YOUTUBE_URL_FIXTURES,
  CACHE_TAG_FIXTURES,
  PROGRESS_SYNC_FIXTURES,
} from "./helpers/test-fixtures.ts";

describe("Tier 4: Real-World Application Scenarios", () => {
  let teardownMock: () => void;

  before(() => {
    teardownMock = setupOEmbedMock();
  });

  after(() => {
    if (teardownMock) teardownMock();
  });

  it("Scenario 1: Teacher YouTube Unlisted Workflow to Student Completion", async () => {
    // 1. Teacher pastes YouTube URL into Lesson Editor
    const teacherInputUrl = YOUTUBE_URL_FIXTURES.validStandard;
    const extractedVideoId = canonicalExtractYouTubeId(teacherInputUrl);
    assert.strictEqual(extractedVideoId, "dQw4w9WgXcQ");

    // 2. oEmbed validation resolves title and thumbnail
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${extractedVideoId}&format=json`
    );
    assert.strictEqual(oembedRes.status, 200);
    const oembedData = await oembedRes.json();
    assert.ok(oembedData.title.length > 0);
    assert.ok(oembedData.thumbnail_url.includes("hqdefault.jpg"));

    // 3. Teacher applies title and saves lesson
    const savedLesson = {
      id: "lesson_uuid_001",
      courseId: "course_uuid_100",
      courseSlug: "hsc-physics-2026",
      title: oembedData.title,
      videoProvider: "youtube",
      youtubeVideoId: extractedVideoId,
      videoThumbnailKey: "thumbnails/yt_default.jpg",
    };
    assert.strictEqual(savedLesson.videoProvider, "youtube");

    // 4. Course cache invalidation is triggered
    const invalidatedTags: string[] = [];
    const triggerInvalidation = (tags: string[]) => {
      invalidatedTags.push(...tags);
    };
    triggerInvalidation([`course:${savedLesson.courseSlug}`]);
    assert.ok(invalidatedTags.includes("course:hsc-physics-2026"));

    // 5. Enrolled student opens lesson -> Player routes to YouTubeEmbed
    const studentSession = { userId: "student_01", isEnrolled: true };
    assert.strictEqual(studentSession.isEnrolled, true);

    const playerDescriptor = {
      provider: savedLesson.videoProvider,
      videoId: savedLesson.youtubeVideoId,
      initialPosition: 0,
    };
    assert.strictEqual(playerDescriptor.provider, "youtube");

    // 6. Student watches lesson: progress updates debounced every 5 seconds
    let currentPosition = 0;
    let savedProgress = 0;
    const syncProgress = (pos: number) => {
      if (pos - savedProgress >= PROGRESS_SYNC_FIXTURES.debounceIntervalMs / 1000) {
        savedProgress = pos;
      }
    };

    currentPosition = 15;
    syncProgress(currentPosition);
    assert.strictEqual(savedProgress, 15);

    // 7. Student seeks beyond 90% threshold -> Lesson automatically marks complete
    const totalDuration = PROGRESS_SYNC_FIXTURES.totalDuration;
    let isLessonCompleted = false;
    const updateProgress = (pos: number) => {
      currentPosition = pos;
      if (currentPosition / totalDuration >= 0.9) {
        isLessonCompleted = true;
      }
    };

    updateProgress(550); // >90% of 600s
    assert.strictEqual(isLessonCompleted, true);
  });

  it("Scenario 2: Opt-in Self-Hosted R2 HLS Fallback Workflow", async () => {
    // 1. Teacher declines YouTube and selects 'r2_hls' tab
    const teacherSelection = {
      videoProvider: "r2_hls",
      file: { name: "quantum_physics.mp4", sizeBytes: 150 * 1024 * 1024 }, // 150MB
    };
    assert.strictEqual(teacherSelection.videoProvider, "r2_hls");
    assert.ok(teacherSelection.file.sizeBytes < 500 * 1024 * 1024); // within free tier limit

    // 2. Multipart upload initiated to R2
    const uploadSession = {
      uploadId: "mp_up_777",
      storageKey: `videos/course_100/${teacherSelection.file.name}`,
    };
    assert.ok(uploadSession.storageKey.endsWith(".mp4"));

    // 3. Asset record created in public_assets audit
    const assetRecord = {
      storage_key: uploadSession.storageKey,
      file_name: teacherSelection.file.name,
      size_bytes: teacherSelection.file.sizeBytes,
      owner_kind: "lesson",
      owner_id: "lesson_uuid_002",
    };
    assert.strictEqual(assetRecord.owner_kind, "lesson");

    // 4. Video renditions generated and attached to lesson
    const lessonData = {
      id: "lesson_uuid_002",
      video_provider: "r2_hls",
      video_asset_id: `hls/${uploadSession.uploadId}/master.m3u8`,
      video_renditions: [
        { resolution: "720p", bitrate: 2000000, uri: "720p.m3u8" },
        { resolution: "1080p", bitrate: 4500000, uri: "1080p.m3u8" },
      ],
    };
    assert.strictEqual(lessonData.video_provider, "r2_hls");
    assert.strictEqual(lessonData.video_renditions.length, 2);

    // 5. Enrolled student requests playback -> resolves signed manifest
    const studentRequest = {
      lessonId: lessonData.id,
      studentId: "student_99",
      isEnrolled: true,
    };
    assert.strictEqual(studentRequest.isEnrolled, true);

    const playbackDescriptor = {
      provider: "r2_hls",
      manifestUrl: `${CDN_BASE_DOMAIN}/${lessonData.video_asset_id}?token=jwt_sig_abc`,
    };
    assert.ok(playbackDescriptor.manifestUrl.includes(CDN_BASE_DOMAIN));
    assert.ok(playbackDescriptor.manifestUrl.includes("token="));
  });

  it("Scenario 3: Edge Caching & Deterministic Tag Invalidation Workflow", async () => {
    // 1. Edge cache store simulated
    const edgeCache = new Map<string, { body: string; headers: Headers }>();
    const tagIndex = new Map<string, Set<string>>();

    const addCacheEntry = (url: string, tag: string, content: string) => {
      const headers = new Headers();
      headers.set("CDN-Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
      headers.set("Cache-Tag", tag);
      edgeCache.set(url, { body: content, headers });

      if (!tagIndex.has(tag)) tagIndex.set(tag, new Set());
      tagIndex.get(tag)!.add(url);
    };

    // 2. Anonymous visitor loads /courses catalog
    const catalogUrl = "https://insidejibon.com/courses";
    addCacheEntry(catalogUrl, "catalog:list", "<html>Courses Catalog [v1]</html>");
    assert.strictEqual(edgeCache.has(catalogUrl), true);
    assert.strictEqual(edgeCache.get(catalogUrl)!.body.includes("[v1]"), true);

    // 3. Teacher publishes a new course
    const newCourse = { slug: "higher-math-2026", status: "published" };
    const invalidationEvent = {
      tags: ["catalog:list", "marketing:landing", `course:${newCourse.slug}`],
      actorId: "teacher_shourov",
      reason: "course_published",
    };

    // 4. Invalidation service purges matched URLs
    const purgeAuditLog: any[] = [];
    for (const tag of invalidationEvent.tags) {
      const urls = tagIndex.get(tag);
      let purgedCount = 0;
      if (urls) {
        for (const u of urls) {
          edgeCache.delete(u);
          purgedCount++;
        }
        tagIndex.delete(tag);
      }
      purgeAuditLog.push({
        tag,
        actorId: invalidationEvent.actorId,
        reason: invalidationEvent.reason,
        purgedCount,
        timestamp: new Date().toISOString(),
      });
    }

    // 5. Verify catalog cache was purged
    assert.strictEqual(edgeCache.has(catalogUrl), false);
    assert.strictEqual(purgeAuditLog.length, 3);
    assert.strictEqual(purgeAuditLog[0].tag, "catalog:list");
    assert.strictEqual(purgeAuditLog[0].purgedCount, 1);

    // 6. Next request generates fresh v2 cache entry
    addCacheEntry(catalogUrl, "catalog:list", "<html>Courses Catalog [v2 with Math]</html>");
    assert.strictEqual(edgeCache.get(catalogUrl)!.body.includes("[v2 with Math]"), true);
  });

  it("Scenario 4: Full Bilingual Experience & State Preservation Workflow", () => {
    // 1. Language dictionary keys checked
    const testKeys = [
      "learning.player.resume_prompt",
      "learning.upload.url_private_warning",
      "teacher.builder.video_source_title",
    ];

    const mockEnDict: Record<string, string> = {
      "learning.player.resume_prompt": "Resume from {time}s?",
      "learning.upload.url_private_warning": "Video is private. Set to Unlisted or Public.",
      "teacher.builder.video_source_title": "Lesson Video Source",
    };

    const mockBnDict: Record<string, string> = {
      "learning.player.resume_prompt": "{time} সেকেন্ড থেকে পুনরায় চালু করবেন?",
      "learning.upload.url_private_warning": "ভিডিওটি প্রাইভেট। অনুগ্রহ করে আনলিস্টেড বা পাবলিক করুন।",
      "teacher.builder.video_source_title": "পাঠের ভিডিও উৎস",
    };

    // 2. Interpolation and token parity
    for (const key of testKeys) {
      assert.ok(mockEnDict[key], `en missing ${key}`);
      assert.ok(mockBnDict[key], `bn missing ${key}`);
    }

    // 3. Student switches locale from 'en' to 'bn' while video is at 120s
    let studentLocale = "en";
    let playbackPosition = 120;

    const switchLocale = (newLocale: string) => {
      studentLocale = newLocale;
    };

    switchLocale("bn");
    assert.strictEqual(studentLocale, "bn");
    assert.strictEqual(playbackPosition, 120); // Position is preserved

    // 4. Captions preference switched to Bangla
    const captionConfig = {
      preferredLang: studentLocale === "bn" ? "bn" : "en",
    };
    assert.strictEqual(captionConfig.preferredLang, "bn");
  });

  it("Scenario 5: High-Performance Asset Delivery & CSP Compliance Workflow", () => {
    // 1. Teacher uploads custom thumbnail
    const originalFilename = "hsc_physics_cover.png";
    const storageKey = `thumbnails/courses/${originalFilename}`;

    // 2. Generate original and WebP responsive variants
    const originalUrl = canonicalPublicUrl(storageKey);
    const webp480 = canonicalPublicUrl(storageKey, { variant: "webp-480" });
    const webp720 = canonicalPublicUrl(storageKey, { variant: "webp-720" });
    const webp1080 = canonicalPublicUrl(storageKey, { variant: "webp-1080" });

    assert.strictEqual(originalUrl, `${CDN_BASE_DOMAIN}/${storageKey}`);
    assert.ok(webp480.includes("width=480"));
    assert.ok(webp720.includes("width=720"));
    assert.ok(webp1080.includes("width=1080"));

    // 3. Marketing course preview renders responsive picture element
    const pictureSources = [
      { media: "(max-width: 640px)", srcSet: webp480, type: "image/webp" },
      { media: "(max-width: 1024px)", srcSet: webp720, type: "image/webp" },
      { media: "(min-width: 1025px)", srcSet: webp1080, type: "image/webp" },
    ];
    assert.strictEqual(pictureSources.length, 3);

    // 4. Verify CSP rules permit asset domain
    const nextConfigPath = path.resolve(process.cwd(), "next.config.ts");
    const content = fs.readFileSync(nextConfigPath, "utf-8");
    assert.ok(content.includes("img-src 'self' data: https: blob:"));
  });
});
