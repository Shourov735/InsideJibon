import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/utils";
import { signClassroomTicket, encodeTicket } from "@/lib/live-ticket";
import { getDb } from "@/db";
import { classSessions, courses } from "@/db/schema";
import { enqueue } from "@/lib/cloudflare/queues";
import { requireUser } from "@/lib/permissions";
import { extractYouTubeVideoId } from "@/lib/video/youtube";

/**
 * R3 — Live class HTTP + WebSocket entry point.
 *
 * Routes (all under `/api/live/[sessionId]`):
 *   GET  /api/live/[sessionId]              → JSON room snapshot
 *   GET  /api/live/[sessionId]/ticket       → short-lived WS ticket for the caller
 *   POST /api/live/[sessionId]/start        → teacher-only; creates the DO instance
 *   POST /api/live/[sessionId]/youtube-live → teacher-only; sets the YouTube Live id
 *   POST /api/live/[sessionId]/youtube-replay → teacher-only; sets the replay id
 *   POST /api/live/[sessionId]/end          → teacher-only; ends the class + flushes
 *   GET  /api/live/[sessionId]/ws           → upgrades to WebSocket via the DO
 *
 * Auth: every entry point calls `getCurrentUser()` / `requireUser()`.
 * Teacher-only endpoints re-verify ownership via the same chain used in
 * `services/classes/classes.ts` (session → course → teacherId).
 */

export const runtime = "nodejs";

type Params = { sessionId: string; path?: string[] };

const youtubeLiveBody = z.object({
  videoId: z.string().min(11).max(20),
  url: z.string().url().optional(),
});

const youtubeReplayBody = z.object({
  videoId: z.string().min(11).max(20),
  url: z.string().url().optional(),
});

async function resolveBinding() {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as unknown as {
    CLASSROOM_ROOM?: {
      idFromName(name: string): unknown;
      get(id: unknown): {
        fetch(req: Request): Promise<Response>;
      };
    };
    NOTIFICATIONS_QUEUE?: { send(message: unknown): Promise<void> };
  };
}

function resolvePath(segments: string[] | undefined): string {
  return (segments ?? []).join("/");
}

async function getSessionWithCourse(sessionId: string) {
  if (!isUuid(sessionId)) return null;
  const db = getDb();
  const [row] = await db
    .select({
      session: classSessions,
      course: courses,
    })
    .from(classSessions)
    .innerJoin(courses, eq(classSessions.courseId, courses.id))
    .where(eq(classSessions.id, sessionId))
    .limit(1);
  return row ?? null;
}

function noStoreJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function loadDoBinding() {
  const env = await resolveBinding();
  if (!env.CLASSROOM_ROOM) {
    throw new Error("CLASSROOM_ROOM binding not configured");
  }
  return env.CLASSROOM_ROOM;
}

// ---------------------------------------------------------------------------
// GET handlers
// ---------------------------------------------------------------------------

export async function GET(
  request: Request,
  ctx: { params: Promise<Params> }
): Promise<Response> {
  const { sessionId, path } = await ctx.params;
  const sub = resolvePath(path);

  if (sub === "" || sub === "status") {
    return getStatus(sessionId);
  }
  if (sub === "ticket") {
    return getTicket(sessionId);
  }
  if (sub === "ws") {
    return getWebSocketUpgrade(request, sessionId);
  }
  return noStoreJson({ ok: false, error: "not_found" }, 404);
}

async function getStatus(sessionId: string): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return noStoreJson({ ok: false, error: "unauthenticated" }, 401);

  const row = await getSessionWithCourse(sessionId);
  if (!row) return noStoreJson({ ok: false, error: "not_found" }, 404);

  // Authorization: students must have an active enrollment; teachers
  // must own the course; admins always allowed.
  if (user.role === "student") {
    const db = getDb();
    const { enrollments } = await import("@/db/schema");
    const { and, eq: eqOp } = await import("drizzle-orm");
    const enrolled = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eqOp(enrollments.studentId, user.id),
          eqOp(enrollments.courseId, row.course.id),
          eqOp(enrollments.status, "active")
        )
      )
      .limit(1);
    if (enrolled.length === 0) {
      return noStoreJson({ ok: false, error: "forbidden" }, 403);
    }
  } else if (user.role === "teacher" && row.course.teacherId !== user.id) {
    return noStoreJson({ ok: false, error: "forbidden" }, 403);
  } else if (user.role !== "teacher" && user.role !== "admin") {
    return noStoreJson({ ok: false, error: "forbidden" }, 403);
  }

  const role: "teacher" | "student" = user.role === "teacher" ? "teacher" : "student";
  return noStoreJson({
    ok: true,
    session: {
      id: row.session.id,
      title: row.session.title,
      description: row.session.description,
      scheduledAt: row.session.scheduledAt,
      durationMinutes: row.session.durationMinutes,
      status: row.session.status,
      courseId: row.course.id,
      courseTitle: row.course.title,
      teacherId: row.course.teacherId,
      maxParticipants: row.session.maxParticipants,
      lobbyOpensAt: row.session.lobbyOpensAt,
      endedAt: row.session.endedAt,
      youtubeLiveVideoId: row.session.youtubeLiveVideoId,
      youtubeReplayVideoId: row.session.youtubeReplayVideoId,
      replayStatus: row.session.replayStatus,
    },
    viewer: {
      userId: user.id,
      role,
      name: user.name,
    },
  });
}

async function getTicket(sessionId: string): Promise<Response> {
  const user = await requireUser();
  const row = await getSessionWithCourse(sessionId);
  if (!row) return noStoreJson({ ok: false, error: "not_found" }, 404);

  // Same authz as getStatus.
  if (user.role === "teacher" && row.course.teacherId !== user.id) {
    return noStoreJson({ ok: false, error: "forbidden" }, 403);
  }
  if (user.role === "student") {
    const db = getDb();
    const { enrollments } = await import("@/db/schema");
    const { and, eq: eqOp } = await import("drizzle-orm");
    const enrolled = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eqOp(enrollments.studentId, user.id),
          eqOp(enrollments.courseId, row.course.id),
          eqOp(enrollments.status, "active")
        )
      )
      .limit(1);
    if (enrolled.length === 0) {
      return noStoreJson({ ok: false, error: "forbidden" }, 403);
    }
  }

  const role: "teacher" | "student" = user.role === "teacher" ? "teacher" : "student";
  const ticket = await signClassroomTicket({
    userId: user.id,
    sessionId,
    role,
  });
  return noStoreJson({ ok: true, ticket, encoded: encodeTicket(ticket) });
}

async function getWebSocketUpgrade(
  request: Request,
  sessionId: string
): Promise<Response> {
  const user = await requireUser();
  const row = await getSessionWithCourse(sessionId);
  if (!row) return noStoreJson({ ok: false, error: "not_found" }, 404);

  // Authorization recheck (defense in depth — same rules as /ticket).
  if (user.role === "teacher" && row.course.teacherId !== user.id) {
    return noStoreJson({ ok: false, error: "forbidden" }, 403);
  }
  if (user.role === "student") {
    const db = getDb();
    const { enrollments } = await import("@/db/schema");
    const { and, eq: eqOp } = await import("drizzle-orm");
    const enrolled = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eqOp(enrollments.studentId, user.id),
          eqOp(enrollments.courseId, row.course.id),
          eqOp(enrollments.status, "active")
        )
      )
      .limit(1);
    if (enrolled.length === 0) {
      return noStoreJson({ ok: false, error: "forbidden" }, 403);
    }
  }

  let doBinding;
  try {
    doBinding = await loadDoBinding();
  } catch (err) {
    return noStoreJson({ ok: false, error: (err as Error).message }, 503);
  }

  const id = doBinding.idFromName(sessionId);
  const stub = doBinding.get(id);

  // Forward the upgrade request to the DO. The DO performs the actual
  // WS handshake. We pass session metadata in headers so the DO can
  // initialize itself on first call.
  const url = new URL(request.url);
  url.pathname = "/ws";
  const headers = new Headers(request.headers);
  headers.set("x-session-id", sessionId);
  headers.set("x-teacher-id", row.course.teacherId ?? "");
  headers.set("x-max-participants", String(row.session.maxParticipants));
  if (row.session.youtubeLiveVideoId) {
    headers.set("x-youtube-live", row.session.youtubeLiveVideoId);
  }
  if (row.session.youtubeReplayVideoId) {
    headers.set("x-youtube-replay", row.session.youtubeReplayVideoId);
  }

  return stub.fetch(
    new Request(url.toString(), {
      method: request.method,
      headers,
      // We pass the original request body for the WS upgrade handshake;
      // Next.js's Request body is consumed once, but the underlying
      // WS upgrade does not need a body.
    })
  );
}

// ---------------------------------------------------------------------------
// POST handlers
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  ctx: { params: Promise<Params> }
): Promise<Response> {
  const { sessionId, path } = await ctx.params;
  const sub = resolvePath(path);
  const user = await requireUser();

  const row = await getSessionWithCourse(sessionId);
  if (!row) return noStoreJson({ ok: false, error: "not_found" }, 404);
  if (user.role !== "teacher" || row.course.teacherId !== user.id) {
    return noStoreJson({ ok: false, error: "forbidden" }, 403);
  }

  switch (sub) {
    case "start":
      return postStart(sessionId, row.session);
    case "youtube-live":
      return postYoutubeLive(request, sessionId, row.session);
    case "youtube-replay":
      return postYoutubeReplay(request, sessionId, row.session);
    case "end":
      return postEnd(sessionId, row.session);
    default:
      return noStoreJson({ ok: false, error: "not_found" }, 404);
  }
}

async function postStart(
  sessionId: string,
  session: typeof classSessions.$inferSelect
): Promise<Response> {
  // Touching the DO via `fetch` causes the platform to allocate the
  // instance. Subsequent /ws upgrades land on the same isolate.
  let doBinding;
  try {
    doBinding = await loadDoBinding();
  } catch (err) {
    return noStoreJson({ ok: false, error: (err as Error).message }, 503);
  }

  const id = doBinding.idFromName(sessionId);
  const stub = doBinding.get(id);
  await stub.fetch(new Request("https://do.local/start", { method: "GET" }));

  const db = getDb();
  await db
    .update(classSessions)
    .set({
      status: "upcoming",
      roomDurableObjectId: sessionId,
      updatedAt: new Date(),
    })
    .where(eq(classSessions.id, sessionId));

  return noStoreJson({ ok: true });
}

async function postYoutubeLive(
  request: Request,
  sessionId: string,
  session: typeof classSessions.$inferSelect
): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = youtubeLiveBody.safeParse(body);
  if (!parsed.success) {
    return noStoreJson({ ok: false, error: parsed.error.message }, 400);
  }

  // Accept either the raw 11-char id or a YouTube URL.
  const candidate = parsed.data.videoId ?? parsed.data.url;
  const videoId = candidate ? extractYouTubeVideoId(candidate) : null;
  if (!videoId) {
    return noStoreJson({ ok: false, error: "Invalid YouTube video id." }, 400);
  }

  let doBinding;
  try {
    doBinding = await loadDoBinding();
  } catch (err) {
    return noStoreJson({ ok: false, error: (err as Error).message }, 503);
  }
  const id = doBinding.idFromName(sessionId);
  const stub = doBinding.get(id);
  await stub.fetch(
    new Request("https://do.local/broadcast-live", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId }),
    })
  );

  const db = getDb();
  await db
    .update(classSessions)
    .set({
      youtubeLiveVideoId: videoId,
      updatedAt: new Date(),
    })
    .where(eq(classSessions.id, sessionId));

  // Fire the "class started" notification fan-out.
  await fanOutClassEvent(sessionId, session, "class.started").catch(() => undefined);

  return noStoreJson({ ok: true, videoId });
}

async function postYoutubeReplay(
  request: Request,
  sessionId: string,
  session: typeof classSessions.$inferSelect
): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = youtubeReplayBody.safeParse(body);
  if (!parsed.success) {
    return noStoreJson({ ok: false, error: parsed.error.message }, 400);
  }

  const candidate = parsed.data.videoId ?? parsed.data.url;
  const videoId = candidate ? extractYouTubeVideoId(candidate) : null;
  if (!videoId) {
    return noStoreJson({ ok: false, error: "Invalid YouTube video id." }, 400);
  }

  let doBinding;
  try {
    doBinding = await loadDoBinding();
  } catch (err) {
    return noStoreJson({ ok: false, error: (err as Error).message }, 503);
  }
  const id = doBinding.idFromName(sessionId);
  const stub = doBinding.get(id);
  await stub.fetch(
    new Request("https://do.local/broadcast-replay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId }),
    })
  );

  const db = getDb();
  await db
    .update(classSessions)
    .set({
      youtubeReplayVideoId: videoId,
      replayStatus: "available",
      updatedAt: new Date(),
    })
    .where(eq(classSessions.id, sessionId));

  await fanOutClassEvent(sessionId, session, "class.replay_ready").catch(() => undefined);

  return noStoreJson({ ok: true, videoId });
}

async function postEnd(
  sessionId: string,
  session: typeof classSessions.$inferSelect
): Promise<Response> {
  let doBinding;
  try {
    doBinding = await loadDoBinding();
  } catch (err) {
    return noStoreJson({ ok: false, error: (err as Error).message }, 503);
  }
  const id = doBinding.idFromName(sessionId);
  const stub = doBinding.get(id);
  await stub.fetch(new Request("https://do.local/end", { method: "POST" }));

  const db = getDb();
  await db
    .update(classSessions)
    .set({
      status: "completed",
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(classSessions.id, sessionId));

  await fanOutClassEvent(sessionId, session, "class.ended").catch(() => undefined);

  return noStoreJson({ ok: true });
}

async function fanOutClassEvent(
  sessionId: string,
  session: typeof classSessions.$inferSelect,
  type: "class.reminder" | "class.started" | "class.ended" | "class.replay_ready"
): Promise<void> {
  await enqueue<{
    type: string;
    sessionId: string;
    courseId: string;
    title: string;
    scheduledAt: string | null;
  }>("NOTIFICATIONS_QUEUE", {
    type,
    id: `${type}:${sessionId}:${Date.now()}`,
    payload: {
      type,
      sessionId,
      courseId: session.courseId,
      title: session.title,
      scheduledAt: session.scheduledAt ? session.scheduledAt.toISOString() : null,
    },
  });
}
