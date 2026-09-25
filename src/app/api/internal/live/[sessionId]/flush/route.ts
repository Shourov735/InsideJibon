import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { classAttendance, classChat, classSessions } from "@/db/schema";

/**
 * R3 — Internal flush endpoint hit by the ClassroomRoom DO on class end.
 *
 * The DO calls this with the rolling chat buffer + replay metadata via
 * `ctx.waitUntil(this.flushToPostgres())`. We then:
 *   1. UPSERT each chat row into `class_chat`.
 *   2. UPSERT attendance (best-effort: the DO only emits the userId list;
 *      we capture per-user joinedAt/leftAt as now() since the DO keeps
 *      the authoritative values internally).
 *   3. Persist replay status / YouTube ids into `class_sessions`.
 *
 * The route is intentionally protected by a shared secret. Operators set
 * `LIVE_FLUSH_SECRET` via `wrangler secret put`. This is *not* Clerk-
 * gated because the DO has no Clerk cookie.
 */

export const runtime = "nodejs";

const bodySchema = z.object({
  chat: z
    .array(
      z.object({
        userId: z.string(),
        body: z.string().max(2_000),
        createdAt: z.number().int(),
      })
    )
    .max(2_000),
  endedAt: z.number().int().nullable().optional(),
  replayStatus: z.enum(["none", "available"]).optional(),
  youtubeLiveVideoId: z.string().nullable().optional(),
  youtubeReplayVideoId: z.string().nullable().optional(),
  attendance: z
    .array(
      z.object({
        studentId: z.string(),
        joinedAt: z.number().int(),
        leftAt: z.number().int().optional(),
        totalSeconds: z.number().int().nonnegative(),
      })
    )
    .optional(),
});

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ sessionId: string }> }
): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.LIVE_FLUSH_SECRET;
  if (!expected) {
    // Refuse to accept anything if the secret is not configured.
    return unauthorized();
  }
  if (auth !== `Bearer ${expected}`) {
    return unauthorized();
  }

  const { sessionId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(sessionId)) {
    return NextResponse.json(
      { ok: false, error: "bad_session_id" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.message },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const db = getDb();

  // 1. Chat rows
  if (parsed.data.chat.length > 0) {
    try {
      await db.insert(classChat).values(
        parsed.data.chat.map((m) => ({
          sessionId,
          userId: m.userId,
          body: m.body,
          createdAt: new Date(m.createdAt),
        }))
      );
    } catch (err) {
      console.error("[live-flush] chat insert failed:", err);
    }
  }

  // 2. Attendance rollup
  if (parsed.data.attendance && parsed.data.attendance.length > 0) {
    for (const row of parsed.data.attendance) {
      try {
        await db
          .insert(classAttendance)
          .values({
            sessionId,
            studentId: row.studentId,
            joinedAt: new Date(row.joinedAt),
            leftAt: row.leftAt ? new Date(row.leftAt) : null,
            totalSeconds: row.totalSeconds,
            source: "websocket",
          })
          .onConflictDoUpdate({
            target: [classAttendance.sessionId, classAttendance.studentId],
            set: {
              leftAt: row.leftAt ? new Date(row.leftAt) : null,
              totalSeconds: row.totalSeconds,
            },
          });
      } catch (err) {
        console.error("[live-flush] attendance upsert failed:", err);
      }
    }
  }

  // 3. Session-level bookkeeping
  try {
    await db
      .update(classSessions)
      .set({
        replayStatus: parsed.data.replayStatus ?? "none",
        youtubeLiveVideoId: parsed.data.youtubeLiveVideoId ?? null,
        youtubeReplayVideoId: parsed.data.youtubeReplayVideoId ?? null,
        endedAt: parsed.data.endedAt
          ? new Date(parsed.data.endedAt)
          : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(classSessions.id, sessionId));
  } catch (err) {
    console.error("[live-flush] session update failed:", err);
  }

  return NextResponse.json(
    { ok: true, chat: parsed.data.chat.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}