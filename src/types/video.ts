import type {
  CacheInvalidation,
  NewCacheInvalidation,
  PublicAsset,
  NewPublicAsset,
} from "@/db/schema";

export type {
  CacheInvalidation,
  NewCacheInvalidation,
  PublicAsset,
  NewPublicAsset,
};

/**
 * Valid video backend providers.
 * - 'youtube': Default $0-cost Unlisted YouTube embed via youtube-nocookie.com
 * - 'r2_hls': Opt-in fallback self-hosted HLS via Cloudflare R2 and hls.js
 * - 'external': Legacy/direct video URL fallback
 */
export const VIDEO_PROVIDERS = ["youtube", "r2_hls", "external"] as const;
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];

/**
 * HLS video stream rendition metadata stored in lessons.video_renditions JSONB.
 */
export interface VideoRendition {
  resolution: "480p" | "720p" | "1080p" | string;
  width?: number;
  height?: number;
  bitrateKbps?: number;
  manifestPath?: string;
  codec?: string;
}

/**
 * Common metadata shared by all video providers.
 */
export interface BaseVideoDescriptor {
  provider: VideoProvider;
  durationS?: number | null;
  thumbnailUrl?: string | null;
}

/**
 * YouTube-specific playback descriptor.
 */
export interface YouTubeVideoDescriptor extends BaseVideoDescriptor {
  provider: "youtube";
  videoId: string;
  captionLang?: string | null;
}

/**
 * Self-hosted R2 HLS playback descriptor.
 */
export interface R2HlsVideoDescriptor extends BaseVideoDescriptor {
  provider: "r2_hls";
  manifestUrl: string;
  renditions?: VideoRendition[];
}

/**
 * Direct external video playback descriptor.
 */
export interface ExternalVideoDescriptor extends BaseVideoDescriptor {
  provider: "external";
  videoUrl: string;
  url?: string;
}

/**
 * Strict discriminated union for player routing components.
 */
export type DiscriminatedVideoDescriptor =
  | YouTubeVideoDescriptor
  | R2HlsVideoDescriptor
  | ExternalVideoDescriptor;

/**
 * Universal video descriptor providing contract compatibility with
 * PROJECT.md interface specifications.
 */
export interface VideoDescriptor {
  provider: VideoProvider;
  videoId?: string;
  manifestUrl?: string;
  videoUrl?: string;
  url?: string;
  durationS?: number | null;
  thumbnailUrl?: string | null;
  captionLang?: string | null;
  renditions?: VideoRendition[];
}

/**
 * Result returned by the server-side YouTube oEmbed validation service.
 */
export interface YouTubeValidationResult {
  valid: boolean;
  videoId?: string;
  title?: string;
  authorName?: string;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Student lesson playback response returned by getLessonVideoForStudent.
 */
export interface LessonVideoResponse {
  lessonId: string;
  isFree: boolean;
  video: VideoDescriptor | null;
}

/**
 * Teacher builder payload for updating lesson video configuration.
 */
export interface SetLessonVideoInput {
  lessonId: string;
  videoProvider: VideoProvider;
  youtubeUrlOrId?: string;
  videoAssetId?: string;
  externalUrl?: string;
  thumbnailKey?: string;
  durationS?: number;
  captionLang?: string;
}

/**
 * Props contract for the student lesson player router component.
 */
export interface LessonPlayerProps {
  lessonId: string;
  video: VideoDescriptor;
  initialPosition?: number | null;
  autoPlay?: boolean;
  onPositionUpdate?: (positionS: number) => void;
  onEnded?: () => void;
}
