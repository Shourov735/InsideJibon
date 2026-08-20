"use client";

import { useCallback, useRef, useState } from "react";

import { updateLessonPositionAction } from "@/app/student/actions";

interface LessonVideoProps {
  lessonId: string;
  videoUrl: string;
  initialPosition: number | null;
}

const DIRECT_VIDEO_RE = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i;
const POSITION_SAVE_THRESHOLD = 5; // seconds

function getYouTubeEmbedId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com") {
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.slice("/embed/".length).split("/")[0] || null;
      }
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.slice("/shorts/".length).split("/")[0] || null;
      }
      const id = u.searchParams.get("v");
      if (id) return id;
    }
  } catch {
    // ignore malformed URLs
  }
  return null;
}

function getVimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "vimeo.com" || u.hostname === "player.vimeo.com") {
      const match = u.pathname.match(/^\/(?:video\/)?(\d+)/);
      return match ? match[1] : null;
    }
  } catch {
    // ignore malformed URLs
  }
  return null;
}

/**
 * Renders a lesson's video when present. Supports YouTube, Vimeo and direct
 * video files. For direct files, playback position is saved periodically so
 * the student can resume exactly where they left off.
 */
export function LessonVideo({
  lessonId,
  videoUrl,
  initialPosition,
}: LessonVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSaved = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const youtubeId = getYouTubeEmbedId(videoUrl);
  const vimeoId = getVimeoId(videoUrl);
  const isDirect = DIRECT_VIDEO_RE.test(videoUrl);

  const savePosition = useCallback(
    async (pos: number) => {
      if (pos <= 0) return;
      const floored = Math.floor(pos);
      if (
        lastSaved.current !== null &&
        Math.abs(floored - lastSaved.current) < POSITION_SAVE_THRESHOLD
      ) {
        return;
      }
      lastSaved.current = floored;
      const res = await updateLessonPositionAction({
        lessonId,
        position: floored,
      });
      if (!res.success && res.error) setError(res.error);
    },
    [lessonId]
  );

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.currentTime > 0) {
      void savePosition(video.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (
      video &&
      initialPosition &&
      initialPosition > 0 &&
      initialPosition < video.duration
    ) {
      video.currentTime = initialPosition;
    }
  };

  const containerClass =
    "relative aspect-video w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container-highest shadow-xs";

  if (youtubeId) {
    const start = initialPosition ? `&start=${Math.floor(initialPosition)}` : "";
    return (
      <div className={containerClass}>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?rel=0${start}`}
          title="Lesson video"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (vimeoId) {
    const start = initialPosition ? `#t=${Math.floor(initialPosition)}s` : "";
    return (
      <div className={containerClass}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}${start}`}
          title="Lesson video"
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isDirect) {
    return (
      <div>
        <div className={containerClass}>
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="aspect-video w-full"
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
          />
        </div>
        {error && <p className="mt-2 text-xs font-medium text-error">{error}</p>}
      </div>
    );
  }

  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-primary/40"
    >
      <svg
        className="h-4 w-4"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M8 5v14l11-7z" />
      </svg>
      Open video
    </a>
  );
}