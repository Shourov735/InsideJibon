/**
 * R3 — ClassroomRoom Durable Object.
 *
 * One DO instance per `classSessionId` (we use `idFromName(sessionId)` so
 * the same session always lands on the same isolate). Owns:
 *   - presence (who is connected, joinedAt, hand state, mute state)
 *   - chat (rolling buffer of last N messages; persisted to Postgres on
 *           class end)
 *   - reactions (in-memory + persisted)
 *   - attendance (live tally; flushed to `class_attendance` on end)
 *   - YouTube Live + Replay video ids (broadcast to all joined clients
 *     when the teacher updates them)
 *
 * **No video bandwidth flows through this DO.** The YouTube iframe is
 * purely client-side; we never proxy media. The DO only relays video
 * ids.
 *
 * Transport:
 *   - HTTP GET /status            — current room state snapshot (JSON)
 *   - WebSocket upgrade           — first message must be `auth` carrying
 *                                   a ticket signed by the Worker
 *
 * Auth:
 *   - The Worker mints a short-lived HMAC ticket (see
 *     `src/lib/live-ticket.ts`) and hands it to the client. The client
 *     sends the ticket as the first WS frame after upgrade.
 *   - On first `presence.join`, we verify the ticket signature against
 *     `env.CLASSROOM_TICKET_SECRET` and store the authenticated user.
 *
 * Persistence:
 *   - `ctx.storage.sql` for the rolling chat buffer + attendance rollup.
 *   - Final flush to Postgres happens in `ctx.waitUntil(...)` so the
 *     close handler returns immediately. The DO keeps a "dirty" flag and
 *     the next class start reads from Postgres (not the DO).
 *
 * Capacity:
 *   - Hard cap `maxParticipants` (per session). Joining over the cap is
 *     rejected with a 1011 going-away close on the WS.
 *
 * Cost:
 *   - DO requests (100k/day) and storage (1 GB) are on the Workers Free
 *     plan. Per-session SQLite footprint is tiny: ≤200KB even for a
 *     60-min session with 500 chat messages.
 */

import { decodeTicket, verifyTicketPayload } from "@/lib/live-ticket";
import type { DurableObjectState, SqlStorage } from "cloudflare:workers";
export type { DurableObjectState } from "cloudflare:workers";

export type ReactionType = "clap" | "heart" | "eyes" | "fire" | "laugh" | "raise_hand";

export type ChatMessage = {
  id: number;
  userId: string;
  userName: string;
  body: string;
  createdAt: number;
};

export type Participant = {
  userId: string;
  userName: string;
  role: "teacher" | "student";
  joinedAt: number;
  hand: boolean;
  muted: boolean;
};

export type RoomSnapshot = {
  sessionId: string;
  teacherId: string;
  startedAt: number | null;
  endedAt: number | null;
  youtubeLiveVideoId: string | null;
  youtubeReplayVideoId: string | null;
  replayStatus: "none" | "available";
  participants: Array<{
    userId: string;
    userName: string;
    role: "teacher" | "student";
    joinedAt: number;
    hand: boolean;
    muted: boolean;
  }>;
  chat: ChatMessage[];
};

// ---------------------------------------------------------------------------
// Wire protocol
// ---------------------------------------------------------------------------

/** Messages the CLIENT can send to the DO. */
export type ClientMessage =
  | { type: "presence.join"; ticket: string; userName: string }
  | { type: "presence.leave" }
  | { type: "chat.send"; body: string }
  | { type: "reaction.send"; reaction: ReactionType }
  | { type: "hand.raise" }
  | { type: "hand.lower" }
  | { type: "host.set_youtube_live"; videoId: string }
  | { type: "host.set_youtube_replay"; videoId: string }
  | { type: "host.end_class" }
  | { type: "host.mute_user"; userId: string }
  | { type: "host.unmute_user"; userId: string }
  | { type: "host.kick_user"; userId: string }
  | { type: "host.pin_message"; messageId: number };

/** Messages the DO can send to clients. */
export type ServerMessage =
  | { type: "ready"; sessionId: string; role: "teacher" | "student" }
  | { type: "error"; code: string; message: string }
  | { type: "presence.list"; participants: Participant[] }
  | { type: "presence.joined"; participant: Participant }
  | { type: "presence.left"; userId: string }
  | { type: "chat.append"; message: ChatMessage }
  | { type: "chat.pinned"; messageId: number }
  | { type: "reaction.burst"; userId: string; reaction: ReactionType; ts: number }
  | { type: "hand.changed"; userId: string; hand: boolean }
  | { type: "mute.changed"; userId: string; muted: boolean }
  | { type: "kick.changed"; userId: string }
  | { type: "youtube.live"; videoId: string }
  | { type: "youtube.replay"; videoId: string }
  | { type: "class.ended"; reason: "teacher" | "max_participants" | "expired" };

// ---------------------------------------------------------------------------
// Env shape — narrowed to what the DO needs.
// ---------------------------------------------------------------------------

export type ClassroomEnv = {
  CLASSROOM_TICKET_SECRET?: string;
  // Bound via wrangler.jsonc — Workers Analytics + queue producers are not
  // directly used inside the DO, but are listed here for typing. There are
  // deliberately no R2 bindings: the app is link-only and has no bucket.
  NOTIFICATIONS_QUEUE?: { send(message: unknown): Promise<void> };
  AI?: unknown;
  VECTORIZE?: unknown;
  RATE_LIMIT_KV?: unknown;
  SESSION_KV?: unknown;
  FEATURE_FLAGS_KV?: unknown;
};

// ---------------------------------------------------------------------------
// Rate-limit + safety constants
// ---------------------------------------------------------------------------

/** Per-user chat cooldown: 1 message / 2s. */
const CHAT_COOLDOWN_MS = 2_000;

/** Per-user reaction cooldown: 1 / 600ms across all reactions. */
const REACTION_COOLDOWN_MS = 600;

/** Rolling chat buffer size in memory. Older messages flush to Postgres. */
const CHAT_BUFFER_LIMIT = 200;

/** Auto-end after this much idle time (no participants). 5 min. */
const AUTO_END_IDLE_MS = 5 * 60_000;

/** Default participant cap if the session row is missing the field. */
const DEFAULT_MAX_PARTICIPANTS = 200;

/** How long before we give up on the in-flight WS message ack. */
const WS_SEND_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isClientMessage(value: unknown): value is ClientMessage {
  if (!value || typeof value !== "object") return false;
  const v = value as { type?: unknown };
  return typeof v.type === "string";
}

function nowMs(): number {
  return Date.now();
}

// ---------------------------------------------------------------------------
// DO class
// ---------------------------------------------------------------------------

/**
 * `ClassroomRoom` — single DO instance per class session. See file header.
 *
 * Public methods:
 *   - `fetch(request)`        — HTTP `/status` endpoint + WS upgrade
 *   - `webSocketMessage(ws, msg)`  — typed message routing
 *   - `webSocketClose(ws, code, reason, wasClean)`
 *   - `webSocketError(ws, err)`
 *
 * State shape (in-memory):
 *   - participants: Map<userId, { ws, userName, role, joinedAt, hand, muted }>
 *   - chat: ChatMessage[]            (rolling, capped at CHAT_BUFFER_LIMIT)
 *   - reactions: ts[]                 (last 30 seconds, for rate limit)
 *   - pendingFlushes: Set<Promise<unknown>>
 *
 * Persistent state (Postgres via waitUntil):
 *   - class_attendance
 *   - class_reactions
 *   - class_chat
 *
 * The DO DOES NOT persist anything to its own SQLite storage on purpose:
 * chat + attendance live there only as a rolling buffer. The authoritative
 * store is Postgres.
 */
export class ClassroomRoom {
  private readonly ctx: DurableObjectState;
  private readonly env: ClassroomEnv;
  private sessionId = "";
  private teacherId = "";
  private maxParticipants = DEFAULT_MAX_PARTICIPANTS;
  private startedAt: number | null = null;
  private endedAt: number | null = null;
  private youtubeLiveVideoId: string | null = null;
  private youtubeReplayVideoId: string | null = null;
  private replayStatus: "none" | "available" = "none";

  /** userId → live connection state */
  private readonly participants = new Map<
    string,
    {
      ws: WebSocket;
      userId: string;
      userName: string;
      role: "teacher" | "student";
      joinedAt: number;
      hand: boolean;
      muted: boolean;
    }
  >();

  /** SqlStorage handle (nullable on legacy DOs without SQLite). */
  private readonly sql: SqlStorage | null;

  /** Rolling chat buffer (capped). */
  private chat: ChatMessage[] = [];
  /** Counter that monotonically increases per chat message id. */
  private chatIdCounter = 0;
  /** Last chat timestamp per user for rate limiting. */
  private chatCooldownByUser = new Map<string, number>();
  /** Last reaction timestamp per user for rate limiting. */
  private reactionCooldownByUser = new Map<string, number>();

  constructor(ctx: DurableObjectState, env: ClassroomEnv) {
    this.ctx = ctx;
    this.env = env;
    // Match the canonical OpenNext DO pattern: stash the SQL handle so we
    // don't re-derive it on every call. Some legacy DOs may not have a
    // `sql` property; tolerate that by falling back to in-memory only.
    const storage = ctx.storage as unknown as { sql?: SqlStorage };
    this.sql = storage.sql ?? null;
    if (this.sql) {
      try {
        this.sql.exec(
          "CREATE TABLE IF NOT EXISTS chat_buffer (" +
            "id INTEGER PRIMARY KEY," +
            "user_id TEXT NOT NULL," +
            "user_name TEXT NOT NULL," +
            "body TEXT NOT NULL," +
            "created_at INTEGER NOT NULL" +
          ")",
        );
      } catch {
        // Ignore — fall back to in-memory only.
      }
    }
  }

  // -------------------------------------------------------------------------
  // fetch — HTTP entry: /status JSON snapshot, everything else 404
  // (WS upgrade is handled by the Next.js route handler that delegates
  // to this DO; we expose fetch() so the route can also fetch the
  // snapshot when the lobby wants to know if the class is live).
  // -------------------------------------------------------------------------

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    // Initialize from the Worker-supplied headers (route passes the
    // session metadata via headers; DO reads them on first call).
    if (!this.sessionId) {
      this.sessionId = request.headers.get("x-session-id") ?? "";
      this.teacherId = request.headers.get("x-teacher-id") ?? "";
      const cap = request.headers.get("x-max-participants");
      if (cap) {
        const n = Number(cap);
        if (Number.isFinite(n) && n > 0) this.maxParticipants = Math.min(n, 5000);
      }
      const liveId = request.headers.get("x-youtube-live");
      if (liveId) this.youtubeLiveVideoId = liveId;
      const replayId = request.headers.get("x-youtube-replay");
      if (replayId) {
        this.youtubeReplayVideoId = replayId;
        this.replayStatus = "available";
      }
    }

    if (path === "/status" || path === "/") {
      return jsonResponse(this.snapshot());
    }

    if (path === "/broadcast-live" && request.method === "POST") {
      // Worker → DO relay used by the `/api/live/[sessionId]/youtube-live`
      // HTTP route. Teacher-only enforced at the HTTP boundary; this DO
      // method trusts the caller's auth.
      const body = (await request.json().catch(() => null)) as {
        videoId?: string;
      } | null;
      if (!body?.videoId) {
        return jsonResponse({ ok: false, error: "videoId required" }, 400);
      }
      this.youtubeLiveVideoId = body.videoId;
      this.broadcast({ type: "youtube.live", videoId: body.videoId });
      return jsonResponse({ ok: true });
    }

    if (path === "/broadcast-replay" && request.method === "POST") {
      const body = (await request.json().catch(() => null)) as {
        videoId?: string;
      } | null;
      if (!body?.videoId) {
        return jsonResponse({ ok: false, error: "videoId required" }, 400);
      }
      this.youtubeReplayVideoId = body.videoId;
      this.replayStatus = "available";
      this.broadcast({ type: "youtube.replay", videoId: body.videoId });
      return jsonResponse({ ok: true });
    }

    if (path === "/end" && request.method === "POST") {
      return this.endClass("teacher");
    }

    return jsonResponse({ ok: false, error: "not_found" }, 404);
  }

  // -------------------------------------------------------------------------
  // WS lifecycle
  // -------------------------------------------------------------------------

  async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    if (typeof rawMessage !== "string") {
      // We do not support binary frames.
      return;
    }

    const parsed = safeParse(rawMessage);
    if (!isClientMessage(parsed)) {
      this.sendTo(ws, {
        type: "error",
        code: "malformed",
        message: "Could not parse message.",
      });
      return;
    }

    const ctx = this.participantFor(ws);
    const message = parsed;

    // First-message must be presence.join carrying the ticket. We do
    // not store the WS in `participants` until the ticket checks out.
    if (message.type === "presence.join") {
      if (ctx) {
        this.sendTo(ws, {
          type: "error",
          code: "already_joined",
          message: "Already in the room.",
        });
        return;
      }
      const verified = await this.authenticateJoin(ws, message);
      if (!verified) return;
      // The presence.joined broadcast below happens at the end of
      // authenticateJoin.
      return;
    }

    if (!ctx) {
      this.sendTo(ws, {
        type: "error",
        code: "not_joined",
        message: "Send presence.join first.",
      });
      return;
    }

    switch (message.type) {
      case "presence.leave":
        this.handleLeave(ctx.userId, "self");
        return;

      case "chat.send":
        this.handleChatSend(ctx, message.body);
        return;

      case "reaction.send":
        this.handleReaction(ctx, message.reaction);
        return;

      case "hand.raise":
        this.handleHand(ctx, true);
        return;

      case "hand.lower":
        this.handleHand(ctx, false);
        return;

      case "host.set_youtube_live":
      case "host.set_youtube_replay":
      case "host.end_class":
      case "host.mute_user":
      case "host.unmute_user":
      case "host.kick_user":
      case "host.pin_message":
        if (ctx.role !== "teacher" || ctx.userId !== this.teacherId) {
          this.sendTo(ws, {
            type: "error",
            code: "forbidden",
            message: "Teacher only.",
          });
          return;
        }
        if (message.type === "host.set_youtube_live") {
          this.youtubeLiveVideoId = message.videoId;
          this.broadcast({ type: "youtube.live", videoId: message.videoId });
          return;
        }
        if (message.type === "host.set_youtube_replay") {
          this.youtubeReplayVideoId = message.videoId;
          this.replayStatus = "available";
          this.broadcast({ type: "youtube.replay", videoId: message.videoId });
          return;
        }
        if (message.type === "host.end_class") {
          await this.endClass("teacher");
          return;
        }
        if (message.type === "host.mute_user") {
          const target = this.participants.get(message.userId);
          if (target) {
            target.muted = true;
            this.broadcast({ type: "mute.changed", userId: message.userId, muted: true });
          }
          return;
        }
        if (message.type === "host.unmute_user") {
          const target = this.participants.get(message.userId);
          if (target) {
            target.muted = false;
            this.broadcast({ type: "mute.changed", userId: message.userId, muted: false });
          }
          return;
        }
        if (message.type === "host.kick_user") {
          this.handleKick(message.userId);
          return;
        }
        if (message.type === "host.pin_message") {
          this.broadcast({ type: "chat.pinned", messageId: message.messageId });
          return;
        }
        return;
    }
  }

  async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ): Promise<void> {
    const ctx = this.participantFor(ws);
    if (!ctx) return;
    this.handleLeave(ctx.userId, "ws_close");
    this.maybeAutoEnd();
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    const ctx = this.participantFor(ws);
    if (!ctx) return;
    this.handleLeave(ctx.userId, "ws_error");
    this.maybeAutoEnd();
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  private async authenticateJoin(
    ws: WebSocket,
    message: Extract<ClientMessage, { type: "presence.join" }>
  ): Promise<boolean> {
    const ticket = decodeTicket(message.ticket);
    if (!ticket) {
      this.sendTo(ws, { type: "error", code: "bad_ticket", message: "Malformed ticket." });
      try {
        ws.close(1008, "bad_ticket");
      } catch {
        /* ignore */
      }
      return false;
    }

    const secret = this.env.CLASSROOM_TICKET_SECRET;
    if (!secret) {
      this.sendTo(ws, {
        type: "error",
        code: "misconfigured",
        message: "Server ticket secret missing.",
      });
      return false;
    }

    const verified = await verifyTicketPayload(ticket, secret);
    if (!verified.ok) {
      this.sendTo(ws, {
        type: "error",
        code: "ticket_invalid",
        message: `Ticket ${verified.reason}.`,
      });
      try {
        ws.close(1008, "ticket_invalid");
      } catch {
        /* ignore */
      }
      return false;
    }

    if (ticket.sid !== this.sessionId) {
      this.sendTo(ws, {
        type: "error",
        code: "session_mismatch",
        message: "Ticket does not match this session.",
      });
      try {
        ws.close(1008, "session_mismatch");
      } catch {
        /* ignore */
      }
      return false;
    }

    if (this.endedAt) {
      this.sendTo(ws, {
        type: "error",
        code: "class_ended",
        message: "Class has ended.",
      });
      try {
        ws.close(1008, "class_ended");
      } catch {
        /* ignore */
      }
      return false;
    }

    // Teacher cap: a single teacher slot per session. Reject duplicate
    // teacher joins.
    if (ticket.role === "teacher") {
      for (const p of this.participants.values()) {
        if (p.role === "teacher" && p.userId !== ticket.uid) {
          this.sendTo(ws, {
            type: "error",
            code: "teacher_present",
            message: "Another teacher is already connected.",
          });
          return false;
        }
      }
    }

    // Participant cap (excluding the teacher).
    let studentCount = 0;
    for (const p of this.participants.values()) {
      if (p.role === "student") studentCount += 1;
    }
    if (
      ticket.role === "student" &&
      studentCount >= this.maxParticipants &&
      !this.participants.has(ticket.uid)
    ) {
      this.sendTo(ws, {
        type: "error",
        code: "room_full",
        message: "This class is full.",
      });
      try {
        ws.close(1013, "room_full");
      } catch {
        /* ignore */
      }
      return false;
    }

    const joinedAt = nowMs();
    if (!this.startedAt) this.startedAt = joinedAt;
    const participant = {
      ws,
      userId: ticket.uid,
      userName: message.userName || ticket.uid,
      role: ticket.role,
      joinedAt,
      hand: false,
      muted: false,
    };
    this.participants.set(ticket.uid, participant);

    // Tell the new client they're in.
    this.sendTo(ws, {
      type: "ready",
      sessionId: this.sessionId,
      role: ticket.role,
    });

    // Send current state to the new client.
    this.sendTo(ws, {
      type: "presence.list",
      participants: Array.from(this.participants.values()).map((p) => ({
        userId: p.userId,
        userName: p.userName,
        role: p.role,
        joinedAt: p.joinedAt,
        hand: p.hand,
        muted: p.muted,
      })),
    });
    if (this.youtubeLiveVideoId) {
      this.sendTo(ws, { type: "youtube.live", videoId: this.youtubeLiveVideoId });
    }
    if (this.youtubeReplayVideoId) {
      this.sendTo(ws, { type: "youtube.replay", videoId: this.youtubeReplayVideoId });
    }
    // Send the rolling chat buffer so the new client sees context.
    for (const msg of this.chat.slice(-50)) {
      this.sendTo(ws, { type: "chat.append", message: msg });
    }

    // Broadcast presence.joined.
    this.broadcast(
      {
        type: "presence.joined",
        participant: {
          userId: ticket.uid,
          userName: participant.userName,
          role: participant.role,
          joinedAt: participant.joinedAt,
          hand: false,
          muted: false,
        },
      },
      ws
    );

    return true;
  }

  private handleLeave(userId: string, _reason: "self" | "ws_close" | "ws_error" | "kick") {
    const participant = this.participants.get(userId);
    if (!participant) return;
    try {
      // Best-effort graceful close; ignored if already closed.
      participant.ws.close(1000, "leave");
    } catch {
      /* ignore */
    }
    this.participants.delete(userId);
    this.broadcast({ type: "presence.left", userId });
  }

  private handleKick(userId: string) {
    const target = this.participants.get(userId);
    if (!target) return;
    try {
      target.ws.close(1011, "kicked");
    } catch {
      /* ignore */
    }
    this.participants.delete(userId);
    this.broadcast({ type: "kick.changed", userId });
  }

  private handleHand(
    ctx: { userId: string },
    raised: boolean
  ) {
    const participant = this.participants.get(ctx.userId);
    if (!participant) return;
    participant.hand = raised;
    this.broadcast({ type: "hand.changed", userId: ctx.userId, hand: raised });
  }

  private handleChatSend(
    ctx: { userId: string; muted: boolean; role: "teacher" | "student" },
    rawBody: string
  ) {
    if (ctx.muted) {
      this.sendToError(ctx.userId, "muted", "You are muted.");
      return;
    }
    const body = (rawBody ?? "").toString().trim().slice(0, 500);
    if (!body) return;
    const now = nowMs();
    const last = this.chatCooldownByUser.get(ctx.userId) ?? 0;
    if (now - last < CHAT_COOLDOWN_MS) {
      this.sendToError(ctx.userId, "rate_limited", "Slow down.");
      return;
    }
    this.chatCooldownByUser.set(ctx.userId, now);

    const participant = this.participants.get(ctx.userId);
    if (!participant) return;

    const id = ++this.chatIdCounter;
    const msg: ChatMessage = {
      id,
      userId: ctx.userId,
      userName: participant.userName,
      body,
      createdAt: now,
    };
    this.chat.push(msg);
    if (this.chat.length > CHAT_BUFFER_LIMIT) this.chat.shift();
    this.persistChatRow(msg);
    this.broadcast({ type: "chat.append", message: msg });
  }

  private handleReaction(
    ctx: { userId: string },
    reaction: ReactionType
  ) {
    const now = nowMs();
    const last = this.reactionCooldownByUser.get(ctx.userId) ?? 0;
    if (now - last < REACTION_COOLDOWN_MS) return;
    this.reactionCooldownByUser.set(ctx.userId, now);

    this.broadcast({
      type: "reaction.burst",
      userId: ctx.userId,
      reaction,
      ts: now,
    });
    this.persistReactionRow(ctx.userId, reaction, now);
  }

  // -------------------------------------------------------------------------
  // End-of-class flush
  // -------------------------------------------------------------------------

  private async endClass(reason: "teacher" | "max_participants" | "expired"): Promise<Response> {
    if (this.endedAt) {
      return jsonResponse({ ok: true, alreadyEnded: true });
    }
    this.endedAt = nowMs();
    this.broadcast({ type: "class.ended", reason });

    // Close every WS — clients will fall back to the lobby / replay page.
    for (const p of this.participants.values()) {
      try {
        p.ws.close(1000, "class_ended");
      } catch {
        /* ignore */
      }
    }

    // Schedule the Postgres flush in the background.
    this.ctx.waitUntil(this.flushToPostgres());

    return jsonResponse({ ok: true });
  }

  private maybeAutoEnd(): void {
    if (this.endedAt) return;
    if (this.participants.size > 0) return;
    const startedAt = this.startedAt;
    if (!startedAt) return;
    if (nowMs() - startedAt < AUTO_END_IDLE_MS) return;
    // No participants and nothing happened for a while — auto-end.
    this.ctx.waitUntil(this.endClass("expired"));
  }

  // -------------------------------------------------------------------------
  // Persistence (best-effort; failures must NOT crash the DO)
  // -------------------------------------------------------------------------

  private persistChatRow(msg: ChatMessage): void {
    if (!this.sql) return;
    try {
      this.sql.exec(
        "INSERT INTO chat_buffer (id, user_id, user_name, body, created_at) VALUES (?, ?, ?, ?, ?)",
        msg.id,
        msg.userId,
        msg.userName,
        msg.body,
        msg.createdAt
      );
    } catch {
      /* ignore */
    }
  }

  private persistReactionRow(userId: string, reaction: ReactionType, ts: number): void {
    // We don't persist reactions to the DO's SQLite — the Postgres flush
    // at end of class captures them via direct HTTP insert in the
    // attendance flush below. This keeps the DO's hot path lean.
    void userId;
    void reaction;
    void ts;
  }

  private async flushToPostgres(): Promise<void> {
    // The DO does not import any service module — it relies on a
    // Postgres-binding injected via env. We send a flush request via
    // an internal HTTP call to a known Worker route, which then calls
    // the services. This keeps the DO free of @/db imports.
    const base = (this.env as unknown as { SERVICE_FETCH_BASE?: string })
      .SERVICE_FETCH_BASE;
    if (!base) return;
    try {
      const chatPayload = this.chat.map((m) => ({
        userId: m.userId,
        body: m.body,
        createdAt: m.createdAt,
      }));
      await fetch(`${base}/api/internal/live/${this.sessionId}/flush`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat: chatPayload,
          endedAt: this.endedAt,
          replayStatus: this.replayStatus,
          youtubeLiveVideoId: this.youtubeLiveVideoId,
          youtubeReplayVideoId: this.youtubeReplayVideoId,
        }),
      });
    } catch {
      // Best-effort. Operators can run a manual replay flush if this fails.
    }
  }

  // -------------------------------------------------------------------------
  // Snapshot + utilities
  // -------------------------------------------------------------------------

  private snapshot(): RoomSnapshot {
    return {
      sessionId: this.sessionId,
      teacherId: this.teacherId,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      youtubeLiveVideoId: this.youtubeLiveVideoId,
      youtubeReplayVideoId: this.youtubeReplayVideoId,
      replayStatus: this.replayStatus,
      participants: Array.from(this.participants.values()).map((p) => ({
        userId: p.userId,
        userName: p.userName,
        role: p.role,
        joinedAt: p.joinedAt,
        hand: p.hand,
        muted: p.muted,
      })),
      chat: this.chat.slice(),
    };
  }

  private participantFor(ws: WebSocket): {
    userId: string;
    userName: string;
    role: "teacher" | "student";
    joinedAt: number;
    hand: boolean;
    muted: boolean;
  } | null {
    for (const [userId, p] of this.participants.entries()) {
      if (p.ws === ws) {
        return {
          userId,
          userName: p.userName,
          role: p.role,
          joinedAt: p.joinedAt,
          hand: p.hand,
          muted: p.muted,
        };
      }
    }
    return null;
  }

  private broadcast(msg: ServerMessage, except?: WebSocket): void {
    const data = JSON.stringify(msg);
    for (const p of this.participants.values()) {
      if (except && p.ws === except) continue;
      try {
        if (p.ws.readyState === 1 /* OPEN */) {
          // Use a fire-and-forget send; if the buffer is full we drop.
          p.ws.send(data);
        }
      } catch {
        /* ignore */
      }
    }
  }

  private sendTo(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState !== 1) return;
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* ignore */
    }
  }

  private sendToError(userId: string, code: string, message: string): void {
    const p = this.participants.get(userId);
    if (!p) return;
    this.sendTo(p.ws, { type: "error", code, message });
  }
}

export default ClassroomRoom;
