"use client";

import {
  LessonPlayer,
  type AnyVideoDescriptor,
} from "./learning/lesson-player";
import type { VideoProvider } from "@/types/video";

export type { AnyVideoDescriptor };

export interface LessonVideoProps {
  lessonId: string;
  descriptor?: AnyVideoDescriptor | null;
  video?: AnyVideoDescriptor | null;
  videoProvider?: VideoProvider | null;
  youtubeVideoId?: string | null;
  videoAssetId?: string | null;
  videoUrl?: string | null;
  initialPosition?: number | null;
  autoPlay?: boolean;
  onPositionUpdate?: (positionS: number) => void;
  onEnded?: () => void;
  className?: string;
}

/**
 * Backward compatibility adapter wrapping LessonPlayer.
 * Supports callers using the new VideoDescriptor or legacy direct video fields.
 */
export function LessonVideo({
  lessonId,
  descriptor,
  video,
  videoProvider,
  youtubeVideoId,
  videoAssetId,
  videoUrl,
  initialPosition,
  autoPlay,
  onPositionUpdate,
  onEnded,
  className,
}: LessonVideoProps) {
  const resolvedVideo = video || descriptor || null;

  return (
    <LessonPlayer
      lessonId={lessonId}
      video={resolvedVideo}
      videoProvider={videoProvider}
      youtubeVideoId={youtubeVideoId}
      manifestUrl={videoAssetId}
      videoUrl={videoUrl}
      initialPosition={initialPosition}
      autoPlay={autoPlay}
      onPositionUpdate={onPositionUpdate}
      onEnded={onEnded}
      className={className}
    />
  );
}