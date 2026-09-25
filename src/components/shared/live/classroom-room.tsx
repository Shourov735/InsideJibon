"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

const REACTIONS: Array<"clap" | "heart" | "eyes" | "fire" | "laugh"> = [
  "clap",
  "heart",
  "eyes",
  "fire",
  "laugh",
];

type Reaction = (typeof REACTIONS)[number] | "raise_hand";

type ClientMessage =
  | { type: "presence.join"; ticket: string; userName: string }
  | { type: "presence.leave" }
  | { type: "chat.send"; body: string }
  | { type: "reaction.send"; reaction: Reaction }
  | { type: "hand.raise" }
  | { type: "hand.lower" }
  | { type: "host.set_youtube_live"; videoId: string }
  | { type: "host.set_youtube_replay"; videoId: string }
  | { type: "host.end_class" }
  | { type: "host.mute_user"; userId: string }
  | { type: "host.unmute_user"; userId: string }
  | { type: "host.kick_user"; userId: string }
  | { type: "host.pin_message"; messageId: number };

type Participant = {
  userId: string;
  userName: string;
  role: "teacher" | "student";
  joinedAt: number;
  hand: boolean;
  muted: boolean;
};

type ChatMessage = {
  id: number;
  userId: string;
  userName: string;
  body: string;
  createdAt: number;
};

type ServerMessage =
  | { type: "ready"; sessionId: string; role: "teacher" | "student" }
  | { type: "error"; code: string; message: string }
  | { type: "presence.list"; participants: Participant[] }
  | { type: "presence.joined"; participant: Participant }
  | { type: "presence.left"; userId: string }
  | { type: "chat.append"; message: ChatMessage }
  | { type: "chat.pinned"; messageId: number }
  | { type: "reaction.burst"; userId: string; reaction: Reaction; ts: number }
  | { type: "hand.changed"; userId: string; hand: boolean }
  | { type: "mute.changed"; userId: string; muted: boolean }
  | { type: "kick.changed"; userId: string }
  | { type: "youtube.live"; videoId: string }
  | { type: "youtube.replay"; videoId: string }
  | { type: "class.ended"; reason: string };

const REACTION_EMOJI: Record<Reaction, string> = {
  clap: "👏",
  heart: "❤️",
  eyes: "👀",
  fire: "🔥",
  laugh: "😂",
  raise_hand: "✋",
};

export interface ClassroomRoomProps {
  locale: "en" | "bn";
  sessionId: string;
  courseId: string;
  courseTitle: string;
  teacherName: string;
  ticket: string;
  encodedTicket: string;
  /** Initial YouTube ids if the room already has them. */
  initialYoutubeLiveVideoId: string | null;
  initialYoutubeReplayVideoId: string | null;
  initialReplayStatus: "none" | "available";
  /** May be an admin/teacher override. */
  viewerRole: "teacher" | "student";
  viewerId: string;
  viewerName: string;
  /** Teacher controls rendered when `viewerRole === 'teacher'`. */
  teacherControls?: boolean;
  /** Whether the replay iframe should be shown instead of the live one. */
  forceReplay?: boolean;
}

/**
 * R3 — In-room client.
 *
 * Layout:
 *   - Left column: stage (16:9 YouTube iframe)
 *   - Right column: sidebar with tabs (Chat | Participants)
 *   - Bottom row: reactions strip + raise hand
 *
 * The DO handles presence/chat/reaction broadcast; we keep a local copy
 * of the participant list and chat buffer for rendering. Reactions are
 * transient bursts (the DO rate-limits + broadcasts).
 *
 * Keyboard shortcuts:
 *   R — raise/lower hand
 *   1-5 — clap/heart/eyes/fire/laugh
 *   ? — shortcuts overlay (teacher: also S, E, P, M)
 */
export function ClassroomRoom(props: ClassroomRoomProps) {
  const { t } = useTranslations();
  const [tab, setTab] = useState<"chat" | "participants">("chat");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pinnedMessageId, setPinnedMessageId] = useState<number | null>(null);
  const [handRaised, setHandRaised] = useState(false);
  const [muted, setMuted] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [ended, setEnded] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reactionsTick, setReactionsTick] = useState<
    Array<{ id: number; reaction: Reaction; x: number; ts: number }>
  >([]);
  const [youtubeLiveVideoId, setYoutubeLiveVideoId] = useState(
    props.initialYoutubeLiveVideoId
  );
  const [youtubeReplayVideoId, setYoutubeReplayVideoId] = useState(
    props.initialYoutubeReplayVideoId
  );
  const [showShortcuts, setShowShortcuts] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirror `kicked` / `ended` in refs so the `connect` callback can read
  // them without depending on their state values (which would invalidate
  // the callback on every kick / end and break the WS reconnect loop).
  const kickedRef = useRef(false);
  const endedRef = useRef<string | null>(null);
  useEffect(() => {
    kickedRef.current = kicked;
  }, [kicked]);
  useEffect(() => {
    endedRef.current = ended;
  }, [ended]);
  // Mirror `connect` in a ref so it can self-reference inside its own
  // body (the onclose reconnect path) without tripping
  // react-hooks/immutability.
  const connectRef = useRef<() => void>(() => undefined);
  const isTeacher = props.viewerRole === "teacher";

  const send = useCallback(
    (msg: ClientMessage) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== 1) return;
      try {
        ws.send(JSON.stringify(msg));
      } catch {
        /* ignore */
      }
    },
    []
  );

  // -------------------------------------------------------------------------
  // WS connection management (with auto-reconnect)
  // -------------------------------------------------------------------------

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/api/live/${props.sessionId}/ws`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      setConnectionError((err as Error).message || "ws_failed");
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
      setConnectionError(null);
      send({
        type: "presence.join",
        ticket: props.encodedTicket,
        userName: props.viewerName,
      });
    };

    ws.onmessage = (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data as string) as ServerMessage;
      } catch {
        return;
      }
      switch (msg.type) {
        case "ready":
          // No-op: we keep the participant list from presence.list.
          return;
        case "error":
          if (msg.code === "muted") setMuted(true);
          if (msg.code === "room_full" || msg.code === "session_mismatch" || msg.code === "bad_ticket") {
            setConnectionError(msg.message);
          }
          if (msg.code === "kicked") setKicked(true);
          return;
        case "presence.list":
          setParticipants(msg.participants);
          return;
        case "presence.joined":
          setParticipants((prev) => {
            const filtered = prev.filter((p) => p.userId !== msg.participant.userId);
            return [...filtered, msg.participant];
          });
          return;
        case "presence.left":
          setParticipants((prev) => prev.filter((p) => p.userId !== msg.userId));
          return;
        case "chat.append":
          setChat((prev) => [...prev, msg.message]);
          return;
        case "chat.pinned":
          setPinnedMessageId(msg.messageId);
          return;
        case "reaction.burst":
          // Burst is rendered as a transient floating emoji on screen.
          setReactionsTick((prev) => [
            ...prev,
            {
              id: msg.ts + Math.random(),
              reaction: msg.reaction,
              x: 10 + Math.random() * 80,
              ts: Date.now(),
            },
          ]);
          // GC the tick entry after 4s.
          setTimeout(() => {
            setReactionsTick((prev) =>
              prev.filter((r) => r.id !== msg.ts + Math.random())
            );
          }, 4000);
          return;
        case "hand.changed":
          setParticipants((prev) =>
            prev.map((p) => (p.userId === msg.userId ? { ...p, hand: msg.hand } : p))
          );
          if (msg.userId === props.viewerId) setHandRaised(msg.hand);
          return;
        case "mute.changed":
          setParticipants((prev) =>
            prev.map((p) => (p.userId === msg.userId ? { ...p, muted: msg.muted } : p))
          );
          if (msg.userId === props.viewerId) setMuted(msg.muted);
          return;
        case "kick.changed":
          setParticipants((prev) => prev.filter((p) => p.userId !== msg.userId));
          if (msg.userId === props.viewerId) setKicked(true);
          return;
        case "youtube.live":
          setYoutubeLiveVideoId(msg.videoId);
          return;
        case "youtube.replay":
          setYoutubeReplayVideoId(msg.videoId);
          return;
        case "class.ended":
          setEnded(msg.reason);
          return;
      }
    };

    ws.onclose = () => {
      if (kickedRef.current || endedRef.current) return;
      const backoff = Math.min(5_000, 500 * Math.pow(2, reconnectAttempts.current));
      reconnectAttempts.current += 1;
      reconnectTimer.current = setTimeout(() => connectRef.current(), backoff);
      setConnectionError("reconnecting");
    };

    ws.onerror = () => {
      setConnectionError("ws_error");
    };
  }, [
    props.encodedTicket,
    props.sessionId,
    props.viewerId,
    props.viewerName,
    // send is intentionally omitted — it's a stable useCallback([]).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connectRef.current();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      const ws = wsRef.current;
      if (ws && ws.readyState <= 1) {
        try {
          send({ type: "presence.leave" });
        } catch {
          /* ignore */
        }
        try {
          ws.close(1000, "leave");
        } catch {
          /* ignore */
        }
      }
    };
    // send / connect intentionally stable per-mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Keyboard shortcuts
  // -------------------------------------------------------------------------

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.key === "r" || event.key === "R") {
        if (handRaised) send({ type: "hand.lower" });
        else send({ type: "hand.raise" });
        event.preventDefault();
        return;
      }
      const idx = REACTIONS.indexOf(
        event.key as (typeof REACTIONS)[number]
      );
      if (idx >= 0) {
        send({ type: "reaction.send", reaction: REACTIONS[idx] });
        event.preventDefault();
        return;
      }
      if (event.key === "?") {
        setShowShortcuts((v) => !v);
        event.preventDefault();
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handRaised, send]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleSendChat = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim().slice(0, 500);
    if (!body) return;
    send({ type: "chat.send", body });
    setDraft("");
  };

  const handleReaction = (reaction: Reaction) => {
    if (reaction === "raise_hand") {
      if (handRaised) send({ type: "hand.lower" });
      else send({ type: "hand.raise" });
      return;
    }
    send({ type: "reaction.send", reaction });
  };

  const handleStartYoutubeLive = async (videoId: string) => {
    send({ type: "host.set_youtube_live", videoId });
  };
  const handleMarkReplay = async (videoId: string) => {
    send({ type: "host.set_youtube_replay", videoId });
  };
  const handleEndClass = async () => {
    if (!window.confirm(t("live.teacher.confirmEnd"))) return;
    send({ type: "host.end_class" });
  };

  // -------------------------------------------------------------------------
  // Stage — YouTube iframe
  // -------------------------------------------------------------------------

  const showReplay =
    props.forceReplay ||
    Boolean(youtubeReplayVideoId) ||
    props.initialReplayStatus === "available";
  const stageVideoId = showReplay
    ? youtubeReplayVideoId ?? youtubeLiveVideoId
    : youtubeLiveVideoId;
  const embedSrc = useMemo(() => {
    if (!stageVideoId) return null;
    const params = new URLSearchParams({
      autoplay: "0",
      modestbranding: "1",
      rel: "0",
    });
    return `https://www.youtube-nocookie.com/embed/${stageVideoId}?${params.toString()}`;
  }, [stageVideoId]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (kicked) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-900">
        {t("live.room.participants.kicked")}
      </div>
    );
  }

  if (ended) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 text-center text-sm text-on-surface">
        {t("live.error.classEnded")}
        <p className="mt-2 text-xs text-secondary">({ended})</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {connectionError ? (
        <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t("live.error.networkLost")} ({connectionError})
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-outline-variant bg-black shadow-xs">
          {embedSrc ? (
            <iframe
              title="Live class stage"
              src={embedSrc}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-on-surface-variant">
              {t("live.lobby.teacherHelpTitle")}
            </div>
          )}

          {/* Floating reaction bursts */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {reactionsTick.map((r) => (
              <span
                key={r.id}
                className="absolute bottom-2 animate-bounce text-2xl"
                style={{ left: `${r.x}%` }}
              >
                {REACTION_EMOJI[r.reaction]}
              </span>
            ))}
          </div>
        </div>

        <aside className="flex max-h-[60vh] flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs lg:max-h-none lg:h-full">
          <div className="flex shrink-0 border-b border-outline-variant">
            {(["chat", "participants"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-semibold",
                  tab === key
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:bg-surface-container"
                )}
              >
                {key === "chat"
                  ? t("live.room.tabs.chat")
                  : t("live.room.tabs.participants")}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {tab === "chat" ? (
              <ul className="space-y-2">
                {chat.length === 0 ? (
                  <li className="text-center text-xs text-on-surface-variant">
                    {t("live.room.chat.empty")}
                  </li>
                ) : (
                  chat.slice(-100).map((msg) => (
                    <li
                      key={msg.id}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        msg.userId === props.viewerId
                          ? "bg-primary-container text-on-primary-container"
                          : "bg-surface-container text-on-surface"
                      )}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        {msg.userName}
                        {pinnedMessageId === msg.id ? " · 📌" : ""}
                      </p>
                      <p>{msg.body}</p>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <ul className="space-y-2">
                {participants.length === 0 ? (
                  <li className="text-center text-xs text-on-surface-variant">
                    —
                  </li>
                ) : (
                  participants.map((p) => (
                    <li
                      key={p.userId}
                      className="flex items-center gap-2 rounded-lg bg-surface-container px-3 py-2 text-sm"
                    >
                      <span className="flex-1 truncate">
                        {p.userName}
                        {p.userId === props.viewerId
                          ? ` (${t("live.room.participants.you")})`
                          : ""}
                      </span>
                      {p.role === "teacher" ? (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                          {t("live.room.participants.teacherBadge")}
                        </span>
                      ) : null}
                      {p.hand ? (
                        <span title={t("live.room.participants.handRaised")}>
                          ✋
                        </span>
                      ) : null}
                      {p.muted ? <span title={t("live.room.controls.mute")}>🔇</span> : null}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {tab === "chat" ? (
            <form
              onSubmit={handleSendChat}
              className="flex shrink-0 gap-2 border-t border-outline-variant p-3"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("live.room.chat.placeholder")}
                maxLength={500}
                className="flex-1 rounded-lg border border-outline-variant bg-surface-container px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary hover:bg-primary-container hover:text-on-primary-container"
              >
                {t("live.room.chat.send")}
              </button>
            </form>
          ) : null}
        </aside>
      </div>

      {/* Reactions + raise hand row */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {REACTIONS.map((r, idx) => (
          <button
            key={r}
            type="button"
            onClick={() => handleReaction(r)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-xl hover:scale-110 active:scale-95 transition"
            aria-label={t(`live.room.reactions.${r}`)}
            title={`${idx + 1} · ${t(`live.room.reactions.${r}`)}`}
          >
            {REACTION_EMOJI[r]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleReaction("raise_hand")}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border text-xl transition",
            handRaised
              ? "border-amber-400 bg-amber-100 text-amber-700"
              : "border-outline-variant bg-surface-container-lowest hover:scale-110 active:scale-95"
          )}
          aria-label={t("live.room.reactions.raiseHand")}
          title="R · raise hand"
        >
          {REACTION_EMOJI.raise_hand}
        </button>
      </div>

      <p className="mt-3 text-center text-[10px] text-on-surface-variant">
        {t("live.room.reactions.shortcutsHint")}
      </p>

      {isTeacher && props.teacherControls ? (
        <div className="mt-6 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("live.room.controls.shortcutsTitle")}
          </p>
          <TeacherControls
            onStartLive={handleStartYoutubeLive}
            onMarkReplay={handleMarkReplay}
            onEndClass={handleEndClass}
          />
        </div>
      ) : null}

      {showShortcuts ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="max-w-md rounded-2xl bg-surface p-6 text-sm text-on-surface shadow-xl">
            <h2 className="font-display text-base font-bold">
              {t("live.room.controls.shortcutsTitle")}
            </h2>
            <pre className="mt-3 whitespace-pre-wrap text-xs">
              {isTeacher
                ? t("live.room.controls.shortcutsTeacher")
                : t("live.room.controls.shortcutsStudent")}
            </pre>
            <button
              type="button"
              className="mt-4 inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary"
              onClick={() => setShowShortcuts(false)}
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface TeacherControlsProps {
  onStartLive: (videoId: string) => void;
  onMarkReplay: (videoId: string) => void;
  onEndClass: () => void;
}

function TeacherControls({ onStartLive, onMarkReplay, onEndClass }: TeacherControlsProps) {
  const { t } = useTranslations();
  const [liveInput, setLiveInput] = useState("");
  const [replayInput, setReplayInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (input: string, kind: "live" | "replay") => {
    setError(null);
    const trimmed = input.trim();
    if (!trimmed) {
      setError(t("live.lobby.invalidUrl"));
      return;
    }
    // Extract the 11-char id via a loose regex (we accept the same shape
    // as `src/lib/video/youtube.ts`).
    const match = trimmed.match(
      /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|live\/|(?:.*[?&])v=))([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/i
    );
    const raw = match ? match[1] : null;
    const directMatch = /^[a-zA-Z0-9_-]{11}$/.test(trimmed);
    const videoId = raw ?? (directMatch ? trimmed : null);
    if (!videoId) {
      setError(t("live.lobby.invalidUrl"));
      return;
    }
    if (kind === "live") {
      onStartLive(videoId);
      setLiveInput("");
    } else {
      onMarkReplay(videoId);
      setReplayInput("");
    }
  };

  return (
    <div className="space-y-3">
      <details className="rounded-lg border border-outline-variant bg-surface-container p-3">
        <summary className="cursor-pointer text-xs font-semibold">
          {t("live.lobby.teacherStart")}
        </summary>
        <div className="mt-2 space-y-2">
          <p className="text-[10px] text-secondary">{t("live.lobby.teacherHelpBody")}</p>
          <div className="flex gap-2">
            <input
              value={liveInput}
              onChange={(e) => setLiveInput(e.target.value)}
              placeholder={t("live.lobby.pasteUrl")}
              className="flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => submit(liveInput, "live")}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary"
            >
              {t("live.lobby.submit")}
            </button>
          </div>
        </div>
      </details>

      <details className="rounded-lg border border-outline-variant bg-surface-container p-3">
        <summary className="cursor-pointer text-xs font-semibold">
          {t("live.lobby.teacherReplay")}
        </summary>
        <div className="mt-2 space-y-2">
          <p className="text-[10px] text-secondary">{t("live.recording.replayHelpBody")}</p>
          <div className="flex gap-2">
            <input
              value={replayInput}
              onChange={(e) => setReplayInput(e.target.value)}
              placeholder={t("live.lobby.pasteUrl")}
              className="flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => submit(replayInput, "replay")}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary"
            >
              {t("live.lobby.submit")}
            </button>
          </div>
        </div>
      </details>

      <button
        type="button"
        onClick={onEndClass}
        className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
      >
        {t("live.teacher.endClass")}
      </button>

      {error ? (
        <p className="text-xs text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}
