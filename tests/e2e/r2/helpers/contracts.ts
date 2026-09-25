import fs from "node:fs";
import path from "node:path";

/**
 * Authoritative Interface Contracts and Specification References
 * for InsideJibon Remaster Phase R2.
 */

// 1. YouTube Video Regex Specification
export const YOUTUBE_URL_REGEX =
  /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|live\/|(?:.*[?&])v=))([a-zA-Z0-9_-]{11})/i;
export const YOUTUBE_RAW_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function canonicalExtractYouTubeId(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (YOUTUBE_RAW_ID_REGEX.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(YOUTUBE_URL_REGEX);
  return match ? match[1] : null;
}

// 2. Storage Base & Public URL Specification
export const CDN_BASE_DOMAIN = "https://cdn.insidejibon.com.bd";

export type AssetVariant = "original" | "webp-480" | "webp-720" | "webp-1080";

export function canonicalPublicUrl(
  key: string,
  options?: { variant?: AssetVariant }
): string {
  if (!key) return "";
  const cleanKey = key.replace(/^\/+/, "");
  const variant = options?.variant || "original";

  if (variant === "original") {
    return `${CDN_BASE_DOMAIN}/${cleanKey}`;
  }

  // Cloudflare Image Resizing WebP variant
  const width =
    variant === "webp-480" ? 480 : variant === "webp-720" ? 720 : 1080;
  return `${CDN_BASE_DOMAIN}/cdn-cgi/image/format=webp,width=${width}/${cleanKey}`;
}

// 3. Cloudflare Edge Cache Specification
export function canonicalCacheKey(request: Request): string {
  const url = new URL(request.url);
  const isRSC =
    url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";

  // Strip tracking params
  url.searchParams.delete("ts");
  url.searchParams.delete("utm_source");
  url.searchParams.delete("utm_medium");
  url.searchParams.delete("utm_campaign");

  // Keep or tag RSC requests distinctly from full-document HTML
  if (isRSC) {
    url.searchParams.delete("_rsc");
    return `${url.toString()}#__rsc__`;
  }

  url.searchParams.delete("_rsc");
  return url.toString();
}

export function hasSessionCookie(request: Request): boolean {
  const cookie = request.headers.get("cookie") || "";
  return cookie.includes("__session=");
}

// 4. Content Security Policy (CSP) Directives Specification
export interface ParsedCSP {
  directives: Record<string, string[]>;
  rawPolicy: string;
}

export function parseCSPString(cspString: string): ParsedCSP {
  const directives: Record<string, string[]> = {};
  const parts = cspString.split(";").map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    const tokens = part.split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      const directiveName = tokens[0];
      const directiveValues = tokens.slice(1);
      directives[directiveName] = directiveValues;
    }
  }

  return { directives, rawPolicy: cspString };
}

// 5. Schema & Journal Helpers
export function getJournalEntries(): Array<{ idx: number; tag: string }> {
  const journalPath = path.resolve(
    process.cwd(),
    "src/db/migrations/meta/_journal.json"
  );
  if (!fs.existsSync(journalPath)) return [];
  const content = fs.readFileSync(journalPath, "utf-8");
  const parsed = JSON.parse(content);
  return parsed.entries || [];
}

// 6. i18n Dictionary Key List
export const REQUIRED_I18N_KEYS_R2 = [
  // learning.player (15 keys)
  "learning.player.loading",
  "learning.player.error_title",
  "learning.player.error_unsupported",
  "learning.player.error_private",
  "learning.player.error_network",
  "learning.player.resume_prompt",
  "learning.player.resume_button",
  "learning.player.restart_button",
  "learning.player.completed_badge",
  "learning.player.syncing_progress",
  "learning.player.captions_toggle",
  "learning.player.quality_auto",
  "learning.player.speed_normal",
  "learning.player.fullscreen_enter",
  "learning.player.fullscreen_exit",

  // learning.upload (10 keys)
  "learning.upload.youtube_tab",
  "learning.upload.hls_tab",
  "learning.upload.paste_url_placeholder",
  "learning.upload.validating_url",
  "learning.upload.url_valid",
  "learning.upload.url_invalid",
  "learning.upload.url_private_warning",
  "learning.upload.drag_video_dropzone",
  "learning.upload.uploading_progress",
  "learning.upload.upload_success",

  // asset.variant (8 keys)
  "asset.variant.original",
  "asset.variant.webp_480",
  "asset.variant.webp_720",
  "asset.variant.webp_1080",
  "asset.variant.thumbnail_default",
  "asset.variant.thumbnail_custom",
  "asset.variant.upload_custom",
  "asset.variant.delete_custom",

  // teacher.builder (12 keys)
  "teacher.builder.video_source_title",
  "teacher.builder.use_youtube_title",
  "teacher.builder.fetch_oembed_meta",
  "teacher.builder.channel_label",
  "teacher.builder.duration_label",
  "teacher.builder.unlisted_advice",
  "teacher.builder.hls_fallback_advice",
  "teacher.builder.select_thumbnail",
  "teacher.builder.save_video_config",
  "teacher.builder.saving_video",
  "teacher.builder.video_saved_toast",
  "teacher.builder.remove_video_confirm",
];
