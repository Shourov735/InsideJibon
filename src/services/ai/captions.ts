import "server-only";

import { YoutubeTranscript } from "youtube-transcript";

/**
 * R8 §3.1 — YouTube caption fetch.
 *
 * Uses the public `youtube-transcript` npm package, which scrapes
 * YouTube's `timedtext` endpoint. No API key required. Cost is $0 and
 * bandwidth is bounded by caption size (kilobytes per video). See
 * FREE-TIER-REFERENCE.md §18b.
 *
 * On missing captions, throws a typed error so the pipeline can mark the
 * lesson as `index_skipped` and surface a UI message ("no captions
 * available for this lesson"). Bangla captions fall back to English and
 * the chunk is tagged `source_lang='en'`; the R8 tutor translates on
 * read.
 */

export type CaptionSegment = {
  text: string;
  /** Caption start timestamp in seconds. */
  start: number;
  /** Caption duration in seconds. */
  duration: number;
};

export class CaptionsUnavailableError extends Error {
  constructor(videoId: string, lang: string, cause?: unknown) {
    super(
      `Captions unavailable for videoId=${videoId} lang=${lang}`
    );
    this.name = "CaptionsUnavailableError";
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
}

/**
 * Extract the YouTube video id from any common URL form, or pass through
 * a bare 11-char id. Returns `null` if the input doesn't look like
 * YouTube. Used by the lesson publish/update path to infer the
 * `video_provider='youtube'` state (the R2 column is added separately
 * by R2; until then R8 derives it from `lessons.video_url`).
 */
export function extractYouTubeVideoId(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Bare 11-char id (the YouTube canonical id length).
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  // https://www.youtube.com/watch?v=ID
  // https://youtu.be/ID
  // https://www.youtube.com/embed/ID
  // https://www.youtube.com/shorts/ID
  // https://m.youtube.com/watch?v=ID
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pat of patterns) {
    const m = trimmed.match(pat);
    if (m && m[1]) return m[1];
  }
  return null;
}

/**
 * Returns true if `videoUrl` resolves to a YouTube video id. R8 uses
 * this as the YouTube-provider detection since `lessons.video_provider`
 * is owned by R2 (not yet landed in the codebase).
 */
export function isYouTubeUrl(videoUrl: string | null | undefined): boolean {
  return extractYouTubeVideoId(videoUrl) !== null;
}

/**
 * Fetch auto-captions for a YouTube video. The `youtube-transcript`
 * package handles the `timedtext` HTTP fetch internally. We translate
 * the package's array shape into our typed `CaptionSegment[]`.
 *
 * If `lang='bn'` is requested and YouTube has no Bangla captions, the
 * library throws — we catch and return English captions as the
 * fallback. The caller (chunking pipeline) tags the row's
 * `source_lang='en'` so the R8 tutor can route through translation.
 */
export async function fetchYoutubeCaptions(
  videoId: string,
  lang: "en" | "bn" = "en"
): Promise<{ segments: CaptionSegment[]; effectiveLang: "en" | "bn" }> {
  if (!videoId) throw new CaptionsUnavailableError(videoId, lang);

  try {
    const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang });
    return { segments: normalizeSegments(raw), effectiveLang: lang };
  } catch (primaryError) {
    if (lang === "bn") {
      // Fall back to English so the lesson is still indexable; the
      // tutor will translate at query time via m2m100.
      try {
        const raw = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: "en",
        });
        return { segments: normalizeSegments(raw), effectiveLang: "en" };
      } catch (fallbackError) {
        throw new CaptionsUnavailableError(
          videoId,
          lang,
          fallbackError ?? primaryError
        );
      }
    }
    throw new CaptionsUnavailableError(videoId, lang, primaryError);
  }
}

function normalizeSegments(
  raw: ReadonlyArray<{ text?: unknown; offset?: unknown; duration?: unknown }>
): CaptionSegment[] {
  const out: CaptionSegment[] = [];
  for (const r of raw) {
    const text = typeof r.text === "string" ? r.text.trim() : "";
    if (!text) continue;
    const start = typeof r.offset === "number" ? r.offset : 0;
    const duration = typeof r.duration === "number" ? r.duration : 0;
    out.push({ text, start, duration });
  }
  return out;
}
