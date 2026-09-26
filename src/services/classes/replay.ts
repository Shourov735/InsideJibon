import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import type { Role } from "@/db/schema";
import {
  classChat,
  classReactions,
  classSessions,
  courses,
  enrollments,
  type ClassSession,
} from "@/db/schema";
import { getYouTubeEmbedUrl } from "@/lib/video/youtube";

/**
 * R3 — Replay service.
 *
 * Builds the post-class replay page data: the YouTube embed URL, the
 * chat transcript (scoped to live messages), and the reactions timeline.
 * All reads are per-session; authorization happens at the route layer.
 *
 * The cache header on the embed endpoint is set by the route handler
 * (`Cache-Control: private, max-age=600` per the phase doc §4.3).
 */

export type ReplayEmbed = {
  videoId: string | null;
  embedUrl: string | null;
  /** Whether YouTube should autoplay. Routinely false; let the user click. */
  autoplay: boolean;
  status: ClassSession["replayStatus"];
  scheduledAt: Date | null;
  endedAt: Date | null;
};

export async function getReplayEmbed(
  sessionId: string
): Promise<ReplayEmbed> {
  const db = getDb();
  const [row] = await db
    .select({
      youtubeLiveVideoId: classSessions.youtubeLiveVideoId,
      youtubeReplayVideoId: classSessions.youtubeReplayVideoId,
      replayStatus: classSessions.replayStatus,
      scheduledAt: classSessions.scheduledAt,
      endedAt: classSessions.endedAt,
    })
    .from(classSessions)
    .where(eq(classSessions.id, sessionId))
    .limit(1);
  if (!row) {
    return {
      videoId: null,
      embedUrl: null,
      autoplay: false,
      status: "none",
      scheduledAt: null,
      endedAt: null,
    };
  }
  // Prefer the teacher-pasted replay id; fall back to the live id (YouTube
  // reuses the live id for the auto-generated VOD).
  const videoId = row.youtubeReplayVideoId ?? row.youtubeLiveVideoId ?? null;
  const embedUrl = videoId
    ? getYouTubeEmbedUrl(videoId, { controls: true, rel: false, nocookie: true })
    : null;
  return {
    videoId,
    embedUrl,
    autoplay: false,
    status: row.replayStatus,
    scheduledAt: row.scheduledAt,
    endedAt: row.endedAt,
  };
}

export type ReplayChatMessage = {
  id: bigint;
  userId: string;
  body: string;
  createdAt: Date;
};

/**
 * Persisted chat transcript for the replay overlay (synced via
 * `getCurrentTime()` polling on the YouTube embed).
 */
export async function getReplayChat(
  sessionId: string,
  limit = 500
): Promise<ReplayChatMessage[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: classChat.id,
      userId: classChat.userId,
      body: classChat.body,
      createdAt: classChat.createdAt,
    })
    .from(classChat)
    .where(and(eq(classChat.sessionId, sessionId)))
    .orderBy(classChat.createdAt)
    .limit(limit);
  return rows;
}

export type ReplayReaction = {
  userId: string;
  reaction: string;
  createdAt: Date;
};

/**
 * Reactions timeline used by the replay page to highlight hand-raise
 * moments on the playback scrubber.
 */
export async function getReplayReactions(
  sessionId: string
): Promise<ReplayReaction[]> {
  const db = getDb();
  const rows = await db
    .select({
      userId: classReactions.userId,
      reaction: classReactions.reaction,
      createdAt: classReactions.createdAt,
    })
    .from(classReactions)
    .where(eq(classReactions.sessionId, sessionId))
    .orderBy(classReactions.createdAt)
    .limit(2_000);
  return rows;
}

export type ReplayContext = {
  session: {
    id: string;
    courseId: string;
    title: string;
    description: string | null;
  };
  course: {
    id: string;
    title: string;
    slug: string;
  };
  teacher: {
    id: string;
    name: string | null;
  };
  embed: ReplayEmbed;
  chat: ReplayChatMessage[];
  reactions: ReplayReaction[];
};

/**
 * One-shot helper that joins the session + course + teacher for the
 * replay page. Used by `/student/courses/[courseId]/live/[sessionId]/replay`.
 */
export async function getReplayContext(sessionId: string): Promise<ReplayContext | null> {
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
  if (!row) return null;

  const embed = await getReplayEmbed(sessionId);
  const chat = await getReplayChat(sessionId);
  const reactions = await getReplayReactions(sessionId);

  return {
    session: {
      id: row.session.id,
      courseId: row.session.courseId,
      title: row.session.title,
      description: row.session.description,
    },
    course: {
      id: row.course.id,
      title: row.course.title,
      slug: row.course.slug,
    },
    teacher: {
      id: row.course.teacherId,
      name: null,
    },
    embed,
    chat,
    reactions,
  };
}

/**
 * Authorization check for the replay page. Students must have an active
 * enrollment on the course; teachers must own it; admins always allowed.
 * Returns a boolean + the viewer's role.
 */
export type ReplayAuth =
  | { ok: true; role: Role }
  | { ok: false };

export async function authorizeReplayViewer(
  sessionId: string,
  viewer: { id: string; role: Role }
): Promise<ReplayAuth> {
  const db = getDb();
  const [row] = await db
    .select({
      courseId: classSessions.courseId,
      teacherId: courses.teacherId,
    })
    .from(classSessions)
    .innerJoin(courses, eq(classSessions.courseId, courses.id))
    .where(eq(classSessions.id, sessionId))
    .limit(1);
  if (!row) return { ok: false };

  if (viewer.role === "admin") return { ok: true, role: "admin" };
  if (viewer.role === "teacher") {
    if (row.teacherId !== viewer.id) return { ok: false };
    return { ok: true, role: "teacher" };
  }
  // student
  const enrolled = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, viewer.id),
        eq(enrollments.courseId, row.courseId),
        eq(enrollments.status, "active")
      )
    )
    .limit(1);
  if (enrolled.length === 0) return { ok: false };
  return { ok: true, role: "student" };
}
