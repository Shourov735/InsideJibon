"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface YouTubeEmbedProps {
  videoId: string;
  initialPosition?: number | null;
  autoPlay?: boolean;
  onPositionUpdate?: (positionS: number) => void;
  onEnded?: () => void;
  className?: string;
}

export interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  destroy(): void;
}

export interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

export interface YTApi {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId?: string;
      events?: {
        onReady?: (event: YTPlayerEvent) => void;
        onStateChange?: (event: YTPlayerEvent) => void;
        onError?: (event: YTPlayerEvent) => void;
      };
      playerVars?: Record<string, unknown>;
    }
  ) => YTPlayer;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<YTApi | null> | null = null;

/**
 * Singleton script loader for the YouTube IFrame Player API.
 * Ensures the API script is injected only once across the application lifecycle.
 */
export function loadYouTubeIframeApi(): Promise<YTApi | null> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cannot load YouTube API on server"));
  }

  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag?.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousReady) previousReady();
      resolve(window.YT || null);
    };

    // Polling safety fallback in case script finished before listener attached
    const pollInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(pollInterval);
        resolve(window.YT);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(pollInterval);
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
      }
    }, 10000);
  });

  return ytApiPromise;
}

export function YouTubeEmbed({
  videoId,
  initialPosition,
  autoPlay = false,
  onPositionUpdate,
  onEnded,
  className,
}: YouTubeEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPositionRef = useRef<number>(initialPosition ? Math.floor(initialPosition) : 0);
  const autoCompletedRef = useRef<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startSeconds = initialPosition && initialPosition > 0 ? Math.floor(initialPosition) : 0;

  const flushPosition = useCallback(
    (pos: number) => {
      if (pos < 0) return;
      const floored = Math.floor(pos);
      lastSavedPositionRef.current = floored;
      onPositionUpdate?.(floored);
    },
    [onPositionUpdate]
  );

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollTimerRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== "function") return;

      const currentTime = player.getCurrentTime();
      const duration = typeof player.getDuration === "function" ? player.getDuration() : 0;
      const floored = Math.floor(currentTime);

      // Periodic 5s debounce update
      if (Math.abs(floored - lastSavedPositionRef.current) >= 5) {
        flushPosition(floored);
      }

      // Completion threshold (>90% duration)
      if (duration > 0 && currentTime / duration >= 0.9 && !autoCompletedRef.current) {
        autoCompletedRef.current = true;
        flushPosition(floored);
      }
    }, 1000);
  }, [flushPosition, stopPolling]);

  useEffect(() => {
    let isCancelled = false;

    loadYouTubeIframeApi().then((YT) => {
      if (isCancelled || !iframeRef.current || !YT || !YT.Player) return;

      try {
        playerRef.current = new YT.Player(iframeRef.current, {
          events: {
            onReady: (event: YTPlayerEvent) => {
              if (isCancelled) return;
              if (startSeconds > 0) {
                event.target.seekTo(startSeconds, true);
              }
              if (autoPlay) {
                event.target.playVideo();
              }
            },
            onStateChange: (event: YTPlayerEvent) => {
              if (isCancelled) return;
              const state = event.data;

              // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0
              if (state === 1) {
                startPolling();
              } else if (state === 2) {
                stopPolling();
                const player = playerRef.current;
                if (player && typeof player.getCurrentTime === "function") {
                  flushPosition(player.getCurrentTime());
                }
              } else if (state === 0) {
                stopPolling();
                const player = playerRef.current;
                if (player && typeof player.getDuration === "function") {
                  const duration = player.getDuration();
                  flushPosition(duration > 0 ? duration : player.getCurrentTime());
                }
                onEnded?.();
              }
            },
            onError: (event: YTPlayerEvent) => {
              const code = event.data;
              if (code === 100) {
                setErrorMessage("Video not found or has been removed.");
              } else if (code === 101 || code === 150) {
                setErrorMessage("Embedding has been disabled for this video.");
              } else {
                setErrorMessage("An error occurred while loading the YouTube player.");
              }
            },
          },
        });
      } catch {
        // Player binding error
      }
    });

    return () => {
      isCancelled = true;
      stopPolling();
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.getCurrentTime === "function") {
            const finalPos = Math.floor(playerRef.current.getCurrentTime());
            if (finalPos > 0 && Math.abs(finalPos - lastSavedPositionRef.current) >= 1) {
              flushPosition(finalPos);
            }
          }
          if (typeof playerRef.current.destroy === "function") {
            playerRef.current.destroy();
          }
        } catch {
          // ignore cleanup errors
        }
        playerRef.current = null;
      }
    };
  }, [videoId, startSeconds, autoPlay, flushPosition, onEnded, startPolling, stopPolling]);

  // Embed URL using privacy-enhanced domain youtube-nocookie.com
  const startParam = startSeconds > 0 ? `&start=${startSeconds}` : "";
  const autoPlayParam = autoPlay ? "&autoplay=1" : "&autoplay=0";
  const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&rel=0&playsinline=1&modestbranding=1${startParam}${autoPlayParam}`;

  return (
    <div
      className={
        className ||
        "relative aspect-video w-full overflow-hidden rounded-xl border border-outline-variant bg-black shadow-xs"
      }
    >
      <iframe
        ref={iframeRef}
        src={embedSrc}
        title="YouTube lesson video player"
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      {errorMessage && (
        <div className="absolute inset-x-0 bottom-0 bg-error/90 p-3 text-center text-xs font-semibold text-white">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
