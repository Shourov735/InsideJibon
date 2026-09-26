"use client";

import { useState } from "react";

export interface CoursePreviewVideoProps {
  youtubeVideoId?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  title?: string;
  className?: string;
  badgeLabel?: string;
}

export function CoursePreviewVideo({
  youtubeVideoId,
  thumbnailUrl,
  title = "Course Preview",
  className,
  badgeLabel = "Free 20-Second Preview",
}: CoursePreviewVideoProps) {
  const [isPlayingUnmuted, setIsPlayingUnmuted] = useState(false);

  // If no YouTube video ID is provided, fall back to the static course thumbnail
  if (!youtubeVideoId) {
    if (thumbnailUrl) {
      return (
        <div className={className || "relative aspect-video w-full overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-high"}>
          <img
            src={thumbnailUrl}
            alt={title}
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
        </div>
      );
    }
    return null;
  }

  // Silent 20-second looping preview embed URL matching F16 parameters
  const silentEmbedUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?controls=0&mute=1&autoplay=1&loop=1&playlist=${youtubeVideoId}&start=0&end=20&playsinline=1&modestbranding=1&rel=0`;

  // Full playable interactive embed when user clicks to unmute
  const fullEmbedUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?controls=1&autoplay=1&playsinline=1&rel=0`;

  return (
    <div
      className={
        className ||
        "relative aspect-video w-full overflow-hidden rounded-2xl border border-outline-variant bg-black shadow-xs group"
      }
    >
      <iframe
        src={isPlayingUnmuted ? fullEmbedUrl : silentEmbedUrl}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />

      {/* Floating badge for 20-second silent preview */}
      {!isPlayingUnmuted && (
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white backdrop-blur-xs">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span>{badgeLabel}</span>
        </div>
      )}

      {/* Unmute / Watch Preview button */}
      {!isPlayingUnmuted && (
        <button
          type="button"
          onClick={() => setIsPlayingUnmuted(true)}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-primary/90 px-3 py-1.5 text-xs font-semibold text-on-primary shadow-md backdrop-blur-xs transition-transform hover:scale-105 hover:bg-primary focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Unmute video preview"
        >
          <svg
        className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.5A2.25 2.25 0 0 1 2.25 13.5v-3a2.25 2.25 0 0 1 2.25-2.25h2.25Z"
            />
          </svg>
          <span>Sound</span>
        </button>
      )}
    </div>
  );
}
