"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "@/i18n/client";
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
  validateYouTubeVideo,
  type YouTubeValidationResult,
} from "@/lib/video/youtube";

export type VideoProviderType = "youtube" | "external";

export interface VideoChangePayload {
  videoProvider: VideoProviderType;
  youtubeVideoId: string | null;
  videoUrl: string | null;
  videoAssetId: string | null;
  videoThumbnailKey: string | null;
  videoDurationS?: number | null;
}

export interface LessonVideoEditorProps {
  initialProvider?: VideoProviderType;
  initialVideoUrl?: string | null;
  initialYoutubeVideoId?: string | null;
  initialThumbnailKey?: string | null;
  initialDurationS?: number | null;
  onVideoChange?: (data: VideoChangePayload) => void;
  onAutoSetTitle?: (title: string) => void;
  disabled?: boolean;
}

const DEBOUNCE_DELAY_MS = 400;
const MAX_THUMBNAIL_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const CDN_BASE_DOMAIN = "https://cdn.insidejibon.com.bd";

function clientPublicUrl(key: string, variant: "original" | "webp-480" | "webp-720" = "original"): string {
  if (!key) return "";
  const cleanKey = key.replace(/^\/+/, "").trim();
  if (cleanKey.startsWith("http://") || cleanKey.startsWith("https://") || cleanKey.startsWith("blob:")) {
    return cleanKey;
  }
  if (variant === "original") {
    return `${CDN_BASE_DOMAIN}/${cleanKey}`;
  }
  const width = variant === "webp-480" ? 480 : 720;
  return `${CDN_BASE_DOMAIN}/cdn-cgi/image/format=webp,width=${width}/${cleanKey}`;
}

export function LessonVideoEditor({
  initialProvider = "youtube",
  initialVideoUrl = "",
  initialYoutubeVideoId = null,
  initialThumbnailKey = null,
  initialDurationS = null,
  onVideoChange,
  onAutoSetTitle,
  disabled = false,
}: LessonVideoEditorProps) {
  const { t } = useTranslations();

  // Tab State: "youtube" | "external"
  const [activeTab, setActiveTab] = useState<VideoProviderType>(() => {
    if (initialProvider) return initialProvider;
    if (initialVideoUrl && !extractYouTubeVideoId(initialVideoUrl)) {
      return "external";
    }
    return "youtube";
  });

  // YouTube State
  const initialYtUrl = initialYoutubeVideoId
    ? `https://www.youtube.com/watch?v=${initialYoutubeVideoId}`
    : initialVideoUrl ?? "";
  const initialYtId = initialYoutubeVideoId || extractYouTubeVideoId(initialYtUrl);
  const [youtubeInput, setYoutubeInput] = useState(initialYtUrl);
  const [isValidating, setIsValidating] = useState(false);
  const [preview, setPreview] = useState<{
    title: string;
    authorName: string;
    thumbnailUrl: string;
    videoId: string;
  } | null>(() => {
    if (initialYtId) {
      return {
        videoId: initialYtId,
        title: "YouTube Video",
        authorName: "YouTube Creator",
        thumbnailUrl: getYouTubeThumbnailUrl(initialYtId, "hqdefault"),
      };
    }
    return null;
  });
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [titleApplied, setTitleApplied] = useState(false);

  // External Video State
  const [externalUrl, setExternalUrl] = useState<string>(
    initialProvider === "external" ? (initialVideoUrl ?? "") : ""
  );

  // Thumbnail State
  const [thumbnailSource, setThumbnailSource] = useState<"youtube" | "custom">(
    initialThumbnailKey ? "custom" : "youtube"
  );
  const [customThumbnailPreview, setCustomThumbnailPreview] = useState<string | null>(
    initialThumbnailKey ? clientPublicUrl(initialThumbnailKey, "webp-480") : null
  );
  const [thumbnailKey, setThumbnailKey] = useState<string | null>(initialThumbnailKey);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);

  // Debounce ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to notify parent
  const notifyChange = useCallback(
    (overrides: Partial<VideoChangePayload>) => {
      if (!onVideoChange) return;

      const provider = overrides.videoProvider ?? activeTab;
      let yId: string | null = null;
      let url: string | null = null;

      if (provider === "youtube") {
        yId = overrides.youtubeVideoId !== undefined
          ? overrides.youtubeVideoId
          : (preview?.videoId || extractYouTubeVideoId(youtubeInput));
        url = overrides.videoUrl !== undefined
          ? overrides.videoUrl
          : (yId ? `https://www.youtube.com/watch?v=${yId}` : null);
      } else {
        url = overrides.videoUrl !== undefined ? overrides.videoUrl : externalUrl;
        yId = null;
      }

      const activeThumbKey = overrides.videoThumbnailKey !== undefined
        ? overrides.videoThumbnailKey
        : (thumbnailSource === "custom" ? thumbnailKey : null);

      onVideoChange({
        videoProvider: provider,
        youtubeVideoId: yId,
        videoUrl: url,
        // Always null: the app is link-only and no longer self-hosts media.
        videoAssetId: null,
        videoThumbnailKey: activeThumbKey,
        videoDurationS: overrides.videoDurationS ?? initialDurationS,
      });
    },
    [
      onVideoChange,
      activeTab,
      preview,
      youtubeInput,
      externalUrl,
      thumbnailSource,
      thumbnailKey,
      initialDurationS,
    ]
  );

  // Validate YouTube URL with 400ms debounce
  const executeYouTubeValidation = useCallback(
    async (rawInput: string) => {
      const trimmed = rawInput.trim();
      if (!trimmed) {
        setIsValidating(false);
        setPreview(null);
        setYoutubeError(null);
        notifyChange({
          videoProvider: "youtube",
          youtubeVideoId: null,
          videoUrl: null,
        });
        return;
      }

      setIsValidating(true);
      setYoutubeError(null);

      try {
        const result: YouTubeValidationResult = await validateYouTubeVideo(trimmed);

        if (result.valid && result.videoId) {
          const validPreview = {
            videoId: result.videoId,
            title: result.title || "YouTube Video",
            authorName: result.authorName || "YouTube Creator",
            thumbnailUrl: result.thumbnailUrl || getYouTubeThumbnailUrl(result.videoId, "hqdefault"),
          };
          setPreview(validPreview);
          setYoutubeError(null);
          notifyChange({
            videoProvider: "youtube",
            youtubeVideoId: result.videoId,
            videoUrl: `https://www.youtube.com/watch?v=${result.videoId}`,
          });
        } else {
          setPreview(null);
          const errorMsg = result.error?.includes("private")
            ? t("learning.upload.url_private_warning")
            : (result.error || t("learning.upload.url_invalid"));
          setYoutubeError(errorMsg);
          notifyChange({
            videoProvider: "youtube",
            youtubeVideoId: null,
            videoUrl: null,
          });
        }
      } catch {
        setPreview(null);
        setYoutubeError(t("teacher.builder.youtubeErrorGeneric"));
        notifyChange({
          videoProvider: "youtube",
          youtubeVideoId: null,
          videoUrl: null,
        });
      } finally {
        setIsValidating(false);
      }
    },
    [notifyChange, t]
  );

  // Live input change handler with 400ms debounce
  const handleYouTubeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setYoutubeInput(val);
    setTitleApplied(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setPreview(null);
      setYoutubeError(null);
      setIsValidating(false);
      notifyChange({
        videoProvider: "youtube",
        youtubeVideoId: null,
        videoUrl: null,
      });
      return;
    }

    // Instant format validation
    const fastId = extractYouTubeVideoId(val);
    if (!fastId && !val.includes("http") && val.trim().length > 11) {
      setYoutubeError(t("learning.upload.url_invalid"));
    }

    debounceTimerRef.current = setTimeout(() => {
      void executeYouTubeValidation(val);
    }, DEBOUNCE_DELAY_MS);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Apply YouTube Title to Lesson Title
  const handleApplyTitle = () => {
    if (preview?.title && onAutoSetTitle) {
      onAutoSetTitle(preview.title);
      setTitleApplied(true);
      setTimeout(() => setTitleApplied(false), 3000);
    }
  };

  // Switch Tabs
  const handleTabSwitch = (tab: VideoProviderType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    notifyChange({ videoProvider: tab });
  };

  // Custom Thumbnail Upload Handler
  const handleThumbnailFileSelection = (file: File) => {
    setThumbnailError(null);

    // Validate image format (F19-B1)
    if (!file.type.startsWith("image/")) {
      setThumbnailError("Only image files (.jpg, .png, .webp) are supported.");
      return;
    }

    // Validate size (F19-B2)
    if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
      setThumbnailError("Thumbnail must be smaller than 5MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCustomThumbnailPreview(objectUrl);
    const generatedKey = `thumbnails/lessons/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}.webp`;
    setThumbnailKey(generatedKey);
    setThumbnailSource("custom");
    notifyChange({ videoThumbnailKey: generatedKey });
  };

  // Delete Custom Thumbnail (F19-B4)
  const handleDeleteCustomThumbnail = () => {
    setCustomThumbnailPreview(null);
    setThumbnailKey(null);
    setThumbnailSource("youtube");
    notifyChange({ videoThumbnailKey: null });
  };

  // Active YouTube video ID for preview thumbnail
  const activeYtId = preview?.videoId || extractYouTubeVideoId(youtubeInput);

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs space-y-5">
      {/* Header & Provider Tabs */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3">
          <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <svg
        className="h-4 w-4 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span>{t("teacher.builder.video_source_title")}</span>
          </h4>
          <span className="text-xs text-secondary">
            {t("teacher.builder.videoProvider")}
          </span>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1 rounded-lg bg-surface-container-low border border-outline-variant/60">
          <button
            type="button"
            onClick={() => handleTabSwitch("youtube")}
            disabled={disabled}
            className={`flex items-center justify-center gap-2 rounded-md py-2 px-3 text-xs font-semibold transition-all ${
              activeTab === "youtube"
                ? "bg-surface-container-lowest text-primary shadow-xs border border-outline-variant"
                : "text-secondary hover:text-on-surface hover:bg-surface-container-lowest/50"
            }`}
          >
            <svg className="h-3.5 w-3.5 text-error" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span>{t("learning.upload.youtube_tab")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch("external")}
            disabled={disabled}
            className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-2 rounded-md py-2 px-3 text-xs font-semibold transition-all ${
              activeTab === "external"
                ? "bg-surface-container-lowest text-primary shadow-xs border border-outline-variant"
                : "text-secondary hover:text-on-surface hover:bg-surface-container-lowest/50"
            }`}
          >
            <svg className="h-3.5 w-3.5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span>{t("teacher.builder.providerExternal")}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: YOUTUBE FLOW (DEFAULT, $0) */}
      {activeTab === "youtube" && (
        <div className="space-y-4">
          {/* Guidance Banner */}
          <div className="rounded-lg border border-primary/20 bg-primary-container/10 p-3.5 text-xs text-on-surface space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t("teacher.builder.unlisted_advice")}</span>
            </div>
            <p className="text-secondary leading-relaxed pl-6">
              {t("teacher.builder.youtubeHelp")}
            </p>
          </div>

          {/* Paste Input */}
          <div>
            <label
              htmlFor="youtube-video-url"
              className="block text-xs font-semibold text-on-surface"
            >
              {t("teacher.builder.youtubeUrlLabel")}
            </label>
            <div className="relative mt-1.5">
              <input
                id="youtube-video-url"
                type="text"
                value={youtubeInput}
                onChange={handleYouTubeInputChange}
                placeholder={t("learning.upload.paste_url_placeholder")}
                disabled={disabled}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 pr-10 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {isValidating && (
                <div className="absolute right-3 top-2.5">
                  <svg className="h-5 w-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Validating indicator */}
          {isValidating && (
            <p className="text-xs text-primary font-medium flex items-center gap-1.5">
              <span>{t("teacher.builder.youtubeVerifying")}</span>
            </p>
          )}

          {/* Error Banner */}
          {youtubeError && !isValidating && (
            <div className="rounded-lg border border-error/30 bg-error-container/20 p-3 text-xs text-error font-medium flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{youtubeError}</span>
            </div>
          )}

          {/* Live Preview Card */}
          {preview && !isValidating && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {/* Thumbnail */}
                <div className="relative aspect-video w-full sm:w-44 shrink-0 overflow-hidden rounded-lg border border-emerald-300/60 bg-black">
                  <img
                    src={preview.thumbnailUrl}
                    alt={preview.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-mono text-white">
                    HD
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{t("learning.upload.url_valid")}</span>
                    </span>
                    <span className="text-[11px] font-mono text-secondary">
                      ID: {preview.videoId}
                    </span>
                  </div>

                  <h5 className="text-sm font-bold text-on-surface line-clamp-2">
                    {preview.title}
                  </h5>

                  <p className="text-xs text-secondary">
                    <span className="font-semibold">{t("teacher.builder.channel_label")}:</span> {preview.authorName}
                  </p>

                  {/* Auto-Fill Lesson Title Button */}
                  {onAutoSetTitle && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleApplyTitle}
                        disabled={disabled}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:opacity-50"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span>
                          {titleApplied
                            ? "✓ " + t("teacher.builder.use_youtube_title")
                            : t("teacher.builder.use_youtube_title")}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* TAB 3: EXTERNAL DIRECT VIDEO (LEGACY) */}
      {activeTab === "external" && (
        <div className="space-y-3">
          <div>
            <label
              htmlFor="external-video-url"
              className="block text-xs font-semibold text-on-surface"
            >
              {t("teacher.builder.videoLinkUrl")}
            </label>
            <input
              id="external-video-url"
              type="url"
              value={externalUrl}
              onChange={(e) => {
                setExternalUrl(e.target.value);
                notifyChange({
                  videoProvider: "external",
                  videoUrl: e.target.value.trim() || null,
                });
              }}
              placeholder="https://example.com/video.mp4"
              disabled={disabled}
              className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {externalUrl && (
            <p className="text-xs text-secondary font-mono">
              {externalUrl}
            </p>
          )}
        </div>
      )}

      {/* THUMBNAIL SELECTOR SECTION */}
      <div className="border-t border-outline-variant/60 pt-4 space-y-3">
        <label className="block text-xs font-semibold text-on-surface">
          {t("teacher.builder.select_thumbnail")}
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Option A: YouTube Thumbnail */}
          <button
            type="button"
            onClick={() => {
              setThumbnailSource("youtube");
              setThumbnailKey(null);
              notifyChange({ videoThumbnailKey: null });
            }}
            disabled={disabled}
            className={`flex-1 flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
              thumbnailSource === "youtube"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
            }`}
          >
            <input
              type="radio"
              name="thumbnail-source"
              checked={thumbnailSource === "youtube"}
              onChange={() => {}}
              className="mt-0.5 text-primary focus:ring-primary"
            />
            <div className="space-y-1">
              <span className="text-xs font-bold text-on-surface block">
                {t("asset.variant.thumbnail_default")}
              </span>
              <span className="text-[11px] text-secondary block">
                $0 CDN Bandwidth (img.youtube.com)
              </span>
              {activeYtId && (
                <div className="mt-2 h-16 w-28 overflow-hidden rounded border border-outline-variant">
                  <img
                    src={getYouTubeThumbnailUrl(activeYtId, "hqdefault")}
                    alt="YouTube thumbnail"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          </button>

          {/* Option B: Custom Upload to R2 */}
          <button
            type="button"
            onClick={() => setThumbnailSource("custom")}
            disabled={disabled}
            className={`flex-1 flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
              thumbnailSource === "custom"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
            }`}
          >
            <input
              type="radio"
              name="thumbnail-source"
              checked={thumbnailSource === "custom"}
              onChange={() => {}}
              className="mt-0.5 text-primary focus:ring-primary"
            />
            <div className="space-y-1 flex-1">
              <span className="text-xs font-bold text-on-surface block">
                {t("asset.variant.thumbnail_custom")}
              </span>
              <span className="text-[11px] text-secondary block">
                WebP resized variants (Cloudflare R2)
              </span>

              {thumbnailSource === "custom" && (
                <div className="mt-2 space-y-2">
                  {customThumbnailPreview ? (
                    <div className="relative inline-block">
                      <div className="h-16 w-28 overflow-hidden rounded border border-outline-variant">
                        <img
                          src={customThumbnailPreview}
                          alt="Custom thumbnail"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomThumbnail();
                        }}
                        className="mt-1 text-[11px] text-error hover:underline block"
                      >
                        {t("asset.variant.delete_custom")}
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center rounded border border-outline-variant bg-surface-container-low px-2.5 py-1 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high">
                      <span>{t("asset.variant.upload_custom")}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleThumbnailFileSelection(file);
                        }}
                        disabled={disabled}
                        className="sr-only"
                      />
                    </label>
                  )}
                  {thumbnailError && (
                    <p className="text-[11px] text-error">{thumbnailError}</p>
                  )}
                </div>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
