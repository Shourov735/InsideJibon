"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface HlsPlayerProps {
  manifestUrl: string;
  initialPosition?: number | null;
  autoPlay?: boolean;
  onPositionUpdate?: (positionS: number) => void;
  onEnded?: () => void;
  className?: string;
}

export interface HlsErrorData {
  fatal: boolean;
  type: string;
}

export interface HlsInstance {
  loadSource(url: string): void;
  attachMedia(media: HTMLMediaElement): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  startLoad(): void;
  recoverMediaError(): void;
  destroy(): void;
}

export interface HlsConstructor {
  new (config?: Record<string, unknown>): HlsInstance;
  isSupported(): boolean;
  Events: {
    MANIFEST_PARSED: string;
    ERROR: string;
  };
  ErrorTypes: {
    NETWORK_ERROR: string;
    MEDIA_ERROR: string;
  };
}

declare global {
  interface Window {
    Hls?: HlsConstructor;
  }
}

/**
 * Dynamically loads the HLS.js library.
 * Attempts dynamic import first, falling back to CDN script loading in browser environments.
 */
async function loadHlsLibrary(): Promise<HlsConstructor | null> {
  if (typeof window === "undefined") return null;
  if (window.Hls) return window.Hls;

  try {
    const dynamicImport = new Function("specifier", "return import(specifier)");
    const mod = await dynamicImport("hls.js").catch(() => null);
    if (mod?.default) return mod.default as HlsConstructor;
    if (mod) return mod as HlsConstructor;
  } catch {
    // Dynamic import unavailable, fall through to CDN loader
  }

  return new Promise((resolve) => {
    if (window.Hls) return resolve(window.Hls);

    const existing = document.querySelector('script[data-hls-js="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Hls || null));
      return;
    }

    const script = document.createElement("script");
    script.setAttribute("data-hls-js", "true");
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";
    script.async = true;
    script.onload = () => resolve(window.Hls || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

export function HlsPlayer({
  manifestUrl,
  initialPosition,
  autoPlay = false,
  onPositionUpdate,
  onEnded,
  className,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !manifestUrl) return;

    let isCancelled = false;

    // Check for native Safari / iOS HLS support
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = manifestUrl;
      if (startSeconds > 0) {
        video.currentTime = startSeconds;
      }
      if (autoPlay) {
        video.play().catch(() => {});
      }
      return;
    }

    // Dynamic import of hls.js for Chromium / Firefox browsers
    loadHlsLibrary().then((Hls) => {
      if (isCancelled || !Hls || !Hls.isSupported()) {
        if (!isCancelled && !Hls?.isSupported()) {
          setErrorMessage("HLS video playback is not supported by your browser.");
        }
        return;
      }

      try {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        hlsRef.current = hls;

        hls.loadSource(manifestUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (isCancelled) return;
          if (startSeconds > 0) {
            video.currentTime = startSeconds;
          }
          if (autoPlay) {
            video.play().catch(() => {});
          }
        });

        hls.on(Hls.Events.ERROR, (_event: unknown, data: unknown) => {
          const errData = data as HlsErrorData | undefined;
          if (errData?.fatal) {
            switch (errData.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setErrorMessage("Playback error loading HLS video stream.");
                break;
            }
          }
        });
      } catch {
        setErrorMessage("Failed to initialize HLS video player.");
      }
    });

    return () => {
      isCancelled = true;
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {
          // ignore cleanup errors
        }
        hlsRef.current = null;
      }
    };
  }, [manifestUrl, startSeconds, autoPlay]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (startSeconds > 0 && startSeconds < video.duration) {
      video.currentTime = startSeconds;
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || video.currentTime <= 0) return;

    const currentTime = video.currentTime;
    const duration = video.duration;
    const floored = Math.floor(currentTime);

    // Debounced 5s interval update
    if (Math.abs(floored - lastSavedPositionRef.current) >= 5) {
      flushPosition(floored);
    }

    // Auto-complete at >90% duration threshold
    if (duration > 0 && currentTime / duration >= 0.9 && !autoCompletedRef.current) {
      autoCompletedRef.current = true;
      flushPosition(floored);
    }
  };

  const handlePause = () => {
    const video = videoRef.current;
    if (video && video.currentTime > 0) {
      flushPosition(video.currentTime);
    }
  };

  const handleEnded = () => {
    const video = videoRef.current;
    if (video) {
      flushPosition(video.duration > 0 ? video.duration : video.currentTime);
    }
    onEnded?.();
  };

  return (
    <div
      className={
        className ||
        "relative aspect-video w-full overflow-hidden rounded-xl border border-outline-variant bg-black shadow-xs"
      }
    >
      <video
        ref={videoRef}
        controls
        playsInline
        className="h-full w-full object-contain"
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePause}
        onEnded={handleEnded}
      />
      {errorMessage && (
        <div className="absolute inset-x-0 bottom-0 bg-error/90 p-3 text-center text-xs font-semibold text-white">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
