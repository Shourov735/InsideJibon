"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

export interface ReplayPageProps {
  locale: "en" | "bn";
  sessionId: string;
  courseId: string;
  courseTitle: string;
  sessionTitle: string;
  sessionDescription: string | null;
  scheduledAt: string | null;
  endedAt: string | null;
  embedUrl: string | null;
  replayStatus: "none" | "available";
  chat: Array<{
    id: number | bigint;
    userId: string;
    body: string;
    createdAt: string; // ISO
  }>;
  reactions: Array<{
    userId: string;
    reaction: string;
    createdAt: string;
  }>;
  /** ISO of the very first event of the class — anchor for chat timestamps. */
  startedAt: string;
  /** ISO of the very last event — anchor for chat timestamps (fallback: endedAt). */
  lastEventAt: string;
}

/**
 * R3 — Replay page client.
 *
 * Layout: 16:9 YouTube iframe on the left, scrollable chat transcript on
 * the right. The iframe is loaded with `enablejsapi=1` so we can poll
 * `getCurrentTime()` via `postMessage`. We then derive the wall-clock
 * of each chat message by interpolating between `startedAt` and
 * `lastEventAt` (the DO's authoritative bounds — see `classroom-room.ts`).
 *
 * If the YouTube IFrame API isn't available (postMessage blocked, or
 * `enablejsapi` stripped by CSP), we degrade to a click-to-jump
 * experience: each chat bubble is a link that sets `?t=` on the embed.
 */
export function ReplayPage(props: ReplayPageProps) {
  const { t } = useTranslations();
  const startedAtMs = Date.parse(props.startedAt);
  const lastEventAtMs = Date.parse(props.lastEventAt);
  const durationMs = Math.max(0, lastEventAtMs - startedAtMs);

  // Sorted chat messages with computed "video second" each maps to.
  const chatWithVideoSeconds = useMemo(() => {
    if (!Number.isFinite(startedAtMs) || durationMs <= 0) {
      return props.chat.map((m) => ({ ...m, videoSeconds: 0 }));
    }
    return props.chat.map((m) => {
      const ts = Date.parse(m.createdAt);
      const offset = Math.max(0, ts - startedAtMs);
      const videoSeconds = Math.floor((offset / durationMs) * 60 * 60); // up to 1h cap; YouTube embed handles out-of-range.
      return { ...m, videoSeconds };
    });
  }, [props.chat, startedAtMs, durationMs]);

  const [currentSecond, setCurrentSecond] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Poll the YouTube IFrame API once a second when possible. We use a
  // simple `postMessage` handshake — the API responds with the
  // current playback state.
  useEffect(() => {
    if (!props.embedUrl) return;
    const id = window.setInterval(() => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) return;
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "getCurrentTime", args: [] }),
          "*"
        );
      } catch {
        /* ignore */
      }
    }, 1_000);
    return () => window.clearInterval(id);
  }, [props.embedUrl]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // The IFrame API returns either a number (getCurrentTime) or a
      // structured `{info: ...}` payload for `infoDelivery`. We only
      // care about the number form.
      if (typeof event.data === "number" && Number.isFinite(event.data)) {
        setCurrentSecond(Math.floor(event.data));
        return;
      }
      const data = event.data as unknown;
      if (
        data &&
        typeof data === "object" &&
        "info" in data &&
        typeof (data as { info: { currentTime?: unknown } }).info?.currentTime === "number"
      ) {
        setCurrentSecond(
          Math.floor((data as { info: { currentTime: number } }).info.currentTime)
        );
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (props.replayStatus === "none" || !props.embedUrl) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-sm text-on-surface">
        {t("live.replay.notReady")}
      </div>
    );
  }

  // Append `?start=NN` to the embed for in-page jumps.
  const jumpToEmbed = (seconds: number) =>
    `${props.embedUrl}${props.embedUrl!.includes("?") ? "&" : "?"}start=${seconds}`;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-outline-variant bg-black shadow-xs">
          <iframe
            ref={iframeRef}
            title={`Replay · ${props.sessionTitle}`}
            src={`${props.embedUrl}${props.embedUrl.includes("?") ? "&" : "?"}enablejsapi=1`}
            allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        </div>
        {props.sessionDescription ? (
          <p className="text-sm leading-relaxed text-on-surface">
            {props.sessionDescription}
          </p>
        ) : null}
      </div>

      <aside className="flex max-h-[60vh] flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs lg:max-h-none lg:h-full">
        <div className="shrink-0 border-b border-outline-variant px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("live.replay.chatTranscript")}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {chatWithVideoSeconds.length === 0 ? (
            <p className="text-center text-xs text-on-surface-variant">—</p>
          ) : (
            <ul className="space-y-2">
              {chatWithVideoSeconds.map((msg) => {
                const isCurrent =
                  currentSecond >= msg.videoSeconds &&
                  currentSecond < msg.videoSeconds + 60;
                return (
                  <li
                    key={msg.id}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm transition-colors",
                      isCurrent
                        ? "bg-primary-container text-on-primary-container"
                        : "bg-surface-container text-on-surface"
                    )}
                  >
                    <a
                      href={jumpToEmbed(msg.videoSeconds)}
                      className="block"
                      onClick={(e) => {
                        // Update the iframe src so the user gets
                        // immediate feedback even without JS API.
                        if (iframeRef.current) {
                          iframeRef.current.src = jumpToEmbed(msg.videoSeconds);
                        }
                        // Don't preventDefault — let the link work for
                        // middle-click / cmd-click / noscript.
                        void e;
                      }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        {formatChatTime(msg.createdAt, props.locale)} ·{" "}
                        {formatVideoTime(msg.videoSeconds)}
                      </p>
                      <p>{msg.body}</p>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function formatChatTime(iso: string, locale: "en" | "bn"): string {
  try {
    const fmt = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    return fmt.format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatVideoTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
