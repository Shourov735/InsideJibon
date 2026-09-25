"use client";

import { useCallback, useRef, useState } from "react";
import type { VideoDescriptor as TypesVideoDescriptor, VideoProvider } from "@/types/video";
import type { VideoDescriptor as ServiceVideoDescriptor } from "@/services/lessons/video";
import { updateLessonPositionAction, markLessonCompleteAction } from "@/app/student/actions";
import { YouTubeEmbed } from "./youtube-embed";
import { HlsPlayer } from "./hls-player";

export type AnyVideoDescriptor = TypesVideoDescriptor | ServiceVideoDescriptor;

type ExtendedVideoDescriptor = AnyVideoDescriptor & {
  youtubeVideoId?: string | null;
  url?: string | null;
};

export interface LessonPlayerProps {
  lessonId: string;
  video?: AnyVideoDescriptor | null;
  initialPosition?: number | null;
  autoPlay?: boolean;
  onPositionUpdate?: (positionS: number) => void;
  onEnded?: () => void;
  isCompleted?: boolean;
  onCompletedChange?: (completed: boolean) => void;
  className?: string;
  // Backward compatibility convenience fields
  videoProvider?: VideoProvider | null;
  youtubeVideoId?: string | null;
  manifestUrl?: string | null;
  videoUrl?: string | null;
}

export function LessonPlayer({
  lessonId,
  video,
  initialPosition,
  autoPlay = false,
  onPositionUpdate,
  onEnded,
  isCompleted = false,
  onCompletedChange,
  className,
  videoProvider,
  youtubeVideoId,
  manifestUrl,
  videoUrl,
}: LessonPlayerProps) {
  const [error, setError] = useState<string | null>(null);
  const lastSavedRef = useRef<number | null>(initialPosition ? Math.floor(initialPosition) : null);
  const completedRef = useRef<boolean>(isCompleted);
  const externalVideoRef = useRef<HTMLVideoElement>(null);

  const extVideo = video as ExtendedVideoDescriptor | null | undefined;

  const resolvedYoutubeId =
    extVideo?.videoId || extVideo?.youtubeVideoId || youtubeVideoId || null;

  // Normalize video descriptor from either video prop or flattened props
  const provider: VideoProvider | null =
    extVideo?.provider ||
    videoProvider ||
    (resolvedYoutubeId ? "youtube" : null) ||
    (extVideo?.manifestUrl || manifestUrl ? "r2_hls" : null) ||
    (extVideo?.videoUrl || extVideo?.url || videoUrl ? "external" : null);

  const resolvedManifestUrl =
    extVideo?.manifestUrl || manifestUrl || (provider === "r2_hls" ? extVideo?.url : null) || null;

  const resolvedVideoUrl =
    extVideo?.videoUrl || extVideo?.url || videoUrl || null;

  const handlePositionSync = useCallback(
    async (pos: number) => {
      if (pos <= 0) return;
      const floored = Math.floor(pos);

      // Debounce threshold (5 seconds)
      if (
        lastSavedRef.current !== null &&
        Math.abs(floored - lastSavedRef.current) < 5
      ) {
        return;
      }

      lastSavedRef.current = floored;
      onPositionUpdate?.(floored);

      try {
        const res = await updateLessonPositionAction({
          lessonId,
          position: floored,
        });
        if (!res.success && res.error) {
          setError(res.error);
        }
      } catch {
        // Position update network failure non-blocking
      }
    },
    [lessonId, onPositionUpdate]
  );

  const handleAutoCompletion = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompletedChange?.(true);

    try {
      await markLessonCompleteAction({
        lessonId,
        completed: true,
      });
    } catch {
      // Auto-complete failure non-blocking
    }
  }, [lessonId, onCompletedChange]);

  const handleEnded = useCallback(() => {
    onEnded?.();
    handleAutoCompletion();
  }, [onEnded, handleAutoCompletion]);

  // Handle position sync for external HTML5 video player
  const handleExternalTimeUpdate = () => {
    const el = externalVideoRef.current;
    if (!el || el.currentTime <= 0) return;

    handlePositionSync(el.currentTime);

    if (el.duration > 0 && el.currentTime / el.duration >= 0.9) {
      handleAutoCompletion();
    }
  };

  const handleExternalPause = () => {
    const el = externalVideoRef.current;
    if (el && el.currentTime > 0) {
      handlePositionSync(el.currentTime);
    }
  };

  const handleExternalLoadedMetadata = () => {
    const el = externalVideoRef.current;
    if (
      el &&
      initialPosition &&
      initialPosition > 0 &&
      initialPosition < el.duration
    ) {
      el.currentTime = initialPosition;
    }
  };

  const containerClass =
    className ||
    "relative aspect-video w-full overflow-hidden rounded-xl border border-outline-variant bg-black shadow-xs";

  // Provider branch 1: YouTube Embed
  if (provider === "youtube" && resolvedYoutubeId) {
    return (
      <div className="space-y-2">
        <YouTubeEmbed
          videoId={resolvedYoutubeId}
          initialPosition={initialPosition}
          autoPlay={autoPlay}
          onPositionUpdate={(pos) => {
            handlePositionSync(pos);
            // Check for 90% auto-complete if duration is in video descriptor
            if (video?.durationS && video.durationS > 0 && pos / video.durationS >= 0.9) {
              handleAutoCompletion();
            }
          }}
          onEnded={handleEnded}
          className={containerClass}
        />
        {error && <p className="text-xs font-medium text-error">{error}</p>}
      </div>
    );
  }

  // Provider branch 2: Self-hosted R2 HLS
  if (provider === "r2_hls" && resolvedManifestUrl) {
    return (
      <div className="space-y-2">
        <HlsPlayer
          manifestUrl={resolvedManifestUrl}
          initialPosition={initialPosition}
          autoPlay={autoPlay}
          onPositionUpdate={(pos) => {
            handlePositionSync(pos);
            if (video?.durationS && video.durationS > 0 && pos / video.durationS >= 0.9) {
              handleAutoCompletion();
            }
          }}
          onEnded={handleEnded}
          className={containerClass}
        />
        {error && <p className="text-xs font-medium text-error">{error}</p>}
      </div>
    );
  }

  // Provider branch 3: External HTML5 video URL
  if ((provider === "external" || resolvedVideoUrl) && resolvedVideoUrl) {
    return (
      <div className="space-y-2">
        <div className={containerClass}>
          <video
            ref={externalVideoRef}
            src={resolvedVideoUrl}
            controls
            playsInline
            autoPlay={autoPlay}
            className="h-full w-full object-contain"
            preload="metadata"
            onLoadedMetadata={handleExternalLoadedMetadata}
            onTimeUpdate={handleExternalTimeUpdate}
            onPause={handleExternalPause}
            onEnded={handleEnded}
          />
        </div>
        {error && <p className="text-xs font-medium text-error">{error}</p>}
      </div>
    );
  }

  // Fallback: No video attached
  return (
    <div
      className={
        containerClass +
        " flex flex-col items-center justify-center p-6 text-center bg-surface-container-highest"
      }
    >
      <svg
        className="h-10 w-10 text-outline mb-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
        />
      </svg>
      <span className="text-sm font-medium text-on-surface-variant">
        No video available for this lesson
      </span>
      <span className="text-xs text-secondary mt-1">
        Please check course materials or text notes below.
      </span>
    </div>
  );
}
