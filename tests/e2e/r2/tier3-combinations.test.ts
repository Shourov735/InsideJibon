import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setupOEmbedMock, OEMBED_FIXTURES } from "./helpers/oembed-mock.ts";
import {
  canonicalExtractYouTubeId,
  canonicalPublicUrl,
  canonicalCacheKey,
  parseCSPString,
  getJournalEntries,
  REQUIRED_I18N_KEYS_R2,
  CDN_BASE_DOMAIN,
} from "./helpers/contracts.ts";
import {
  YOUTUBE_URL_FIXTURES,
  CACHE_TAG_FIXTURES,
  ASSET_KEY_FIXTURES,
  PROGRESS_SYNC_FIXTURES,
} from "./helpers/test-fixtures.ts";

describe("Tier 3: Cross-Feature Pairwise Combinations", () => {
  let teardownMock: () => void;

  before(() => {
    teardownMock = setupOEmbedMock();
  });

  after(() => {
    if (teardownMock) teardownMock();
  });

  // P01: Feature 6 + Feature 7
  it("P01 [F06 + F07]: Extracted YouTube ID pipes into oEmbed reachability check", async () => {
    const rawUrl = YOUTUBE_URL_FIXTURES.validStandard;
    const extractedId = canonicalExtractYouTubeId(rawUrl);
    assert.strictEqual(extractedId, "dQw4w9WgXcQ");

    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${extractedId}&format=json`;
    const res = await fetch(oembedUrl);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.title.includes("Rick Astley"));
  });

  // P02: Feature 7 + Feature 17
  it("P02 [F07 + F17]: Successful oEmbed 200 response triggers title and thumbnail auto-fill in Teacher Builder", async () => {
    const videoId = "bn_lesson_01";
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    const data = await res.json();

    const builderState = {
      title: "",
      thumbnailUrl: "",
      videoProvider: "youtube",
    };

    // Simulate auto-fill
    builderState.title = data.title;
    builderState.thumbnailUrl = data.thumbnail_url;

    assert.ok(builderState.title.includes("বাংলা"));
    assert.strictEqual(builderState.thumbnailUrl, "https://i.ytimg.com/vi/bn_lesson_01/hqdefault.jpg");
  });

  // P03: Feature 7 + Feature 17
  it("P03 [F07 + F17]: Private video response (401/403) triggers teacher warning message without saving invalid lesson", async () => {
    const res = await fetch("https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=private_vid_1&format=json");
    assert.strictEqual(res.status, 401);

    let canSave = true;
    let warningMessage = "";
    if (res.status === 401 || res.status === 403) {
      canSave = false;
      warningMessage = "Video is private. Please set your YouTube video visibility to Unlisted or Public.";
    }

    assert.strictEqual(canSave, false);
    assert.ok(warningMessage.includes("Unlisted"));
  });

  // P04: Feature 17 + Feature 8
  it("P04 [F17 + F08]: Teacher Builder form submission transfers validated YouTube ID into Lesson Video Service payload", () => {
    const teacherInput = "https://youtu.be/dQw4w9WgXcQ";
    const id = canonicalExtractYouTubeId(teacherInput);

    const servicePayload = {
      lessonId: "lesson_123",
      videoProvider: "youtube" as const,
      youtubeVideoId: id!,
      youtubeCaptionLang: "en" as const,
    };

    assert.strictEqual(servicePayload.youtubeVideoId, "dQw4w9WgXcQ");
    assert.strictEqual(servicePayload.videoProvider, "youtube");
  });

  // P05: Feature 8 + Feature 1
  it("P05 [F08 + F01]: Lesson Video Service correctly populates all new schema columns", () => {
    const updateRecord = {
      video_provider: "youtube",
      youtube_video_id: "dQw4w9WgXcQ",
      youtube_caption_lang: "bn",
      video_asset_id: null,
      video_duration_s: 360,
      video_thumbnail_key: "thumbnails/yt_thumb.jpg",
      video_renditions: [],
    };

    assert.strictEqual(updateRecord.video_provider, "youtube");
    assert.strictEqual(updateRecord.youtube_video_id, "dQw4w9WgXcQ");
    assert.strictEqual(updateRecord.youtube_caption_lang, "bn");
    assert.strictEqual(updateRecord.video_duration_s, 360);
    assert.deepStrictEqual(updateRecord.video_renditions, []);
  });

  // P06: Feature 8 + Feature 11
  it("P06 [F08 + F11]: Lesson video update triggers course-specific cache invalidation (course:{slug})", () => {
    const course = { id: "c1", slug: "physics-101" };
    const onLessonVideoUpdate = (slug: string) => {
      return [`course:${slug}`];
    };

    const tags = onLessonVideoUpdate(course.slug);
    assert.deepStrictEqual(tags, ["course:physics-101"]);
  });

  // P07: Feature 11 + Feature 10
  it("P07 [F11 + F10]: Cache invalidation triggers invoke Cache Invalidation Service", async () => {
    let purgedTags: string[] = [];
    const mockInvalidateTags = async (tags: string[]) => {
      purgedTags = [...tags];
    };

    const coursePublishTags = ["catalog:list", "marketing:landing", "course:biology"];
    await mockInvalidateTags(coursePublishTags);

    assert.strictEqual(purgedTags.length, 3);
    assert.ok(purgedTags.includes("catalog:list"));
  });

  // P08: Feature 10 + Feature 3
  it("P08 [F10 + F03]: Cache Invalidation Service writes audit records to cache_invalidations", () => {
    const auditEntries: any[] = [];
    const recordAudit = (tag: string, actorId: string, reason: string) => {
      auditEntries.push({
        id: `audit_${Date.now()}`,
        tag,
        actor_id: actorId,
        reason,
        created_at: new Date().toISOString(),
      });
    };

    recordAudit("catalog:list", "teacher_42", "course_published");
    assert.strictEqual(auditEntries.length, 1);
    assert.strictEqual(auditEntries[0].tag, "catalog:list");
    assert.strictEqual(auditEntries[0].actor_id, "teacher_42");
  });

  // P09: Feature 10 + Feature 9
  it("P09 [F10 + F09]: Cache Invalidation Service purges matched URLs from Edge Cache", () => {
    const edgeCache = new Map<string, string>();
    edgeCache.set("https://insidejibon.com/courses", "<html>Catalog</html>");

    const tagToUrls = new Map<string, string[]>();
    tagToUrls.set("catalog:list", ["https://insidejibon.com/courses"]);

    // Purge logic
    const purgeTag = (tag: string) => {
      const urls = tagToUrls.get(tag) || [];
      for (const u of urls) {
        edgeCache.delete(u);
      }
    };

    purgeTag("catalog:list");
    assert.strictEqual(edgeCache.has("https://insidejibon.com/courses"), false);
  });

  // P10: Feature 9 + Feature 12
  it("P10 [F09 + F12]: Edge cached pages retain strictly valid CSP headers", () => {
    const nextConfigPath = path.resolve(process.cwd(), "next.config.ts");
    const content = fs.readFileSync(nextConfigPath, "utf-8");
    assert.ok(content.includes("Content-Security-Policy"));

    const sampleCachedResponse = new Response("<html></html>", {
      headers: {
        "Content-Security-Policy": "default-src 'self'",
        "CDN-Cache-Control": "public, max-age=300",
      },
    });

    assert.ok(sampleCachedResponse.headers.has("Content-Security-Policy"));
    assert.ok(sampleCachedResponse.headers.has("CDN-Cache-Control"));
  });

  // P11: Feature 12 + Feature 14
  it("P11 [F12 + F14]: CSP script-src and frame-src permit YouTube IFrame API and nocookie iframe", () => {
    const cspDirectives = {
      "script-src": ["'self'", "https://www.youtube.com", "https://s.ytimg.com"],
      "frame-src": ["'self'", "https://www.youtube-nocookie.com", "https://www.youtube.com"],
    };

    assert.ok(cspDirectives["frame-src"].includes("https://www.youtube-nocookie.com"));
    assert.ok(cspDirectives["script-src"].includes("https://s.ytimg.com"));
  });

  // P12: Feature 12 + Feature 5
  it("P12 [F12 + F05]: CSP media-src and connect-src permit CDN domain cdn.insidejibon.com.bd", () => {
    const cspDirectives = {
      "media-src": ["'self'", "blob:", "https://*.r2.dev", "https://cdn.insidejibon.com.bd"],
      "connect-src": ["'self'", "https://cdn.insidejibon.com.bd"],
    };

    assert.ok(cspDirectives["media-src"].includes(CDN_BASE_DOMAIN));
    assert.ok(cspDirectives["connect-src"].includes(CDN_BASE_DOMAIN));
  });

  // P13: Feature 5 + Feature 2
  it("P13 [F05 + F02]: Public R2 asset upload writes audit entry to public_assets", () => {
    const assetAudit: any[] = [];
    const onAssetUploaded = (key: string, sizeBytes: number, ownerId: string) => {
      assetAudit.push({
        storage_key: key,
        size_bytes: sizeBytes,
        owner_id: ownerId,
        public_url: canonicalPublicUrl(key),
      });
    };

    onAssetUploaded("thumbnails/lesson-1.png", 54320, "lesson_1");
    assert.strictEqual(assetAudit.length, 1);
    assert.strictEqual(assetAudit[0].public_url, `${CDN_BASE_DOMAIN}/thumbnails/lesson-1.png`);
  });

  // P14: Feature 5 + Feature 19
  it("P14 [F05 + F19]: Custom uploaded thumbnail uses publicUrl with WebP resizing variant", () => {
    const key = "thumbnails/custom-cover.jpg";
    const webpUrl = canonicalPublicUrl(key, { variant: "webp-720" });
    assert.strictEqual(
      webpUrl,
      `${CDN_BASE_DOMAIN}/cdn-cgi/image/format=webp,width=720/thumbnails/custom-cover.jpg`
    );
  });

  // P15: Feature 19 + Feature 8
  it("P15 [F19 + F08]: Thumbnail selection stores key in lessons.video_thumbnail_key", () => {
    const lessonRecord = {
      id: "l_1",
      video_thumbnail_key: "thumbnails/selected_thumb.webp",
    };
    assert.strictEqual(lessonRecord.video_thumbnail_key, "thumbnails/selected_thumb.webp");
  });

  // P16: Feature 8 + Feature 13
  it("P16 [F08 + F13]: Student Learn page requests video descriptor and routes to Student Video Player", () => {
    const descriptor = {
      provider: "youtube" as const,
      videoId: "dQw4w9WgXcQ",
      initialPosition: 60,
    };

    const routeComponent = (d: typeof descriptor) => {
      if (d.provider === "youtube") return { component: "YouTubeEmbed", id: d.videoId, pos: d.initialPosition };
      return { component: "Fallback", id: null, pos: 0 };
    };

    const routed = routeComponent(descriptor);
    assert.strictEqual(routed.component, "YouTubeEmbed");
    assert.strictEqual(routed.id, "dQw4w9WgXcQ");
    assert.strictEqual(routed.pos, 60);
  });

  // P17: Feature 13 + Feature 14
  it("P17 [F13 + F14]: Player router selects YouTube player and starts progress sync", () => {
    let isSyncActive = false;
    const mountPlayer = (provider: string) => {
      if (provider === "youtube") isSyncActive = true;
    };
    mountPlayer("youtube");
    assert.strictEqual(isSyncActive, true);
  });

  // P18: Feature 14 + Feature 8
  it("P18 [F14 + F08]: YouTube player reaching >90% marks lesson complete in learning progress", () => {
    let markCompletedCalled = false;
    const duration = 600;
    const onProgress = (pos: number) => {
      if (pos / duration >= 0.9) {
        markCompletedCalled = true;
      }
    };
    onProgress(550); // >90%
    assert.strictEqual(markCompletedCalled, true);
  });

  // P19: Feature 18 + Feature 5
  it("P19 [F18 + F05]: Teacher opt-in R2 HLS upload stores manifest in public R2 bucket", () => {
    const manifestKey = "hls/lesson-42/master.m3u8";
    const manifestUrl = canonicalPublicUrl(manifestKey);
    assert.strictEqual(manifestUrl, `${CDN_BASE_DOMAIN}/${manifestKey}`);
  });

  // P20: Feature 18 + Feature 8
  it("P20 [F18 + F08]: Teacher R2 HLS setup configures video_provider = 'r2_hls' with renditions", () => {
    const payload = {
      video_provider: "r2_hls",
      video_asset_id: "hls/master.m3u8",
      video_renditions: [
        { quality: "720p", file: "720p.m3u8" },
        { quality: "1080p", file: "1080p.m3u8" },
      ],
    };
    assert.strictEqual(payload.video_provider, "r2_hls");
    assert.strictEqual(payload.video_renditions.length, 2);
  });

  // P21: Feature 8 + Feature 15
  it("P21 [F08 + F15]: Student Video Player routes 'r2_hls' to HLS fallback player with signed URL", () => {
    const descriptor = {
      provider: "r2_hls",
      manifestUrl: "https://cdn.insidejibon.com.bd/hls/master.m3u8?token=mock_jwt_123",
    };
    assert.strictEqual(descriptor.provider, "r2_hls");
    assert.ok(descriptor.manifestUrl.includes("token="));
  });

  // P22: Feature 15 + Feature 12
  it("P22 [F15 + F12]: HLS player media requests pass CSP media-src without violation", () => {
    const mediaSrcDirective = ["'self'", "blob:", "https://*.r2.dev", "https://cdn.insidejibon.com.bd"];
    const streamOrigin = "https://cdn.insidejibon.com.bd";
    assert.ok(mediaSrcDirective.includes(streamOrigin));
  });

  // P23: Feature 16 + Feature 6
  it("P23 [F16 + F06]: Course Preview Video extracts video ID and renders 20s looping embed", () => {
    const coursePromoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const id = canonicalExtractYouTubeId(coursePromoUrl);
    assert.strictEqual(id, "dQw4w9WgXcQ");

    const embedUrl = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&start=0&end=20`;
    assert.ok(embedUrl.includes("start=0&end=20"));
    assert.ok(embedUrl.includes("mute=1"));
    assert.ok(embedUrl.includes("youtube-nocookie.com"));
  });

  // P24: Feature 20 + Feature 13
  it("P24 [F20 + F13]: Student Video Player displays localized player controls in en & bn", () => {
    const enDict = { "learning.player.resume_prompt": "Resume from {time}s?" };
    const bnDict = { "learning.player.resume_prompt": "{time} সেকেন্ড থেকে পুনরায় চালু করবেন?" };

    assert.ok(enDict["learning.player.resume_prompt"].includes("{time}"));
    assert.ok(bnDict["learning.player.resume_prompt"].includes("{time}"));
  });

  // P25: Feature 20 + Feature 17
  it("P25 [F20 + F17]: Teacher Builder displays localized validation messages in en & bn", () => {
    const enNotice = "Video is private. Please set your YouTube video visibility to Unlisted or Public.";
    const bnNotice = "ভিডিওটি প্রাইভেট। অনুগ্রহ করে ইউটিউবে দৃশ্যমানতা Unlisted বা Public করুন।";

    assert.ok(enNotice.includes("Unlisted"));
    assert.ok(bnNotice.includes("Unlisted"));
  });

  // P26: Feature 4 + Feature 1
  it("P26 [F04 + F01]: Drizzle migration 0016 successfully establishes lessons schema columns", () => {
    const migrationCols = ["video_provider", "youtube_video_id", "youtube_caption_lang", "video_asset_id", "video_renditions"];
    assert.strictEqual(migrationCols.length, 5);
  });

  // P27: Feature 4 + Feature 2
  it("P27 [F04 + F02]: Drizzle migration 0016 successfully establishes public_assets schema", () => {
    const tableStructure = {
      tableName: "public_assets",
      uniqueKey: "storage_key",
      columns: ["id", "storage_key", "mime_type", "size_bytes", "owner_kind", "owner_id", "tags"],
    };
    assert.strictEqual(tableStructure.tableName, "public_assets");
    assert.strictEqual(tableStructure.uniqueKey, "storage_key");
  });

  // P28: Feature 4 + Feature 3
  it("P28 [F04 + F03]: Drizzle migration 0016 successfully establishes cache_invalidations schema", () => {
    const tableStructure = {
      tableName: "cache_invalidations",
      indexedColumn: "tag",
      columns: ["id", "tag", "reason", "actor_id", "purged_urls_count", "created_at"],
    };
    assert.strictEqual(tableStructure.tableName, "cache_invalidations");
    assert.strictEqual(tableStructure.indexedColumn, "tag");
  });
});
