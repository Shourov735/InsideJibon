import "server-only";
import { and, asc, desc, eq, gte, isNull, lte, gte as gteOp } from "drizzle-orm";

import { getDb } from "@/db";
import {
  classSessions,
  courses,
  enrollments,
  type ClassSession,
} from "@/db/schema";
import { isUuid } from "@/lib/utils";
import { createCourseNotifications } from "@/services/notifications";
import { enqueue } from "@/lib/cloudflare/queues";
import type {
  CreateClassSessionInput,
  UpdateClassSessionInput,
} from "@/schemas/class-session";

export class ClassSessionNotFoundError extends Error {
  constructor() {
    super("Class session not found.");
  }
}

/** Course → teacher. Returns null when the teacher does not own it. */
export async function verifyCourseOwnership(
  teacherId: string,
  courseId: string
): Promise<{ id: string } | null> {
  if (!isUuid(courseId)) return null;
  const db = getDb();
  const [row] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .limit(1);
  return row ?? null;
}

/** Session → course → teacher. Returns null when the chain does not own it. */
export async function verifySessionOwnership(
  teacherId: string,
  sessionId: string
): Promise<{ session: ClassSession } | null> {
  if (!isUuid(sessionId)) return null;
  const db = getDb();
  const [row] = await db
    .select({ session: classSessions })
    .from(classSessions)
    .innerJoin(courses, eq(classSessions.courseId, courses.id))
    .where(and(eq(classSessions.id, sessionId), eq(courses.teacherId, teacherId)))
    .limit(1);

  return row ? { session: row.session } : null;
}

export async function createClassSession(
  teacherId: string,
  input: CreateClassSessionInput
): Promise<ClassSession> {
  const course = await verifyCourseOwnership(teacherId, input.courseId);
  if (!course) throw new ClassSessionNotFoundError();

  const db = getDb();
  const [session] = await db
    .insert(classSessions)
    .values({
      courseId: input.courseId,
      teacherId,
      title: input.title.trim(),
      description: input.description?.trim(),
      sessionType: input.sessionType,
      externalUrl: input.externalUrl || null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      durationMinutes: input.durationMinutes,
      status: "upcoming",
      lobbyOpensAt: input.scheduledAt
        ? new Date(new Date(input.scheduledAt).getTime() - 15 * 60_000)
        : null,
      maxParticipants: 200,
    })
    .returning();

  await createCourseNotifications(input.courseId, {
    type: "class_session",
    title: `New Class Session: ${session.title}`,
    body: session.scheduledAt ? `Scheduled for ${session.scheduledAt.toISOString().split("T")[0]}` : "Check the classes section for details.",
    link: "/student/notifications"
  });

  return session;
}

export async function updateClassSession(
  teacherId: string,
  sessionId: string,
  input: UpdateClassSessionInput
): Promise<ClassSession> {
  const ownership = await verifySessionOwnership(teacherId, sessionId);
  if (!ownership) throw new ClassSessionNotFoundError();

  const db = getDb();
  const [updated] = await db
    .update(classSessions)
    .set({
      title: input.title.trim(),
      description: input.description?.trim(),
      sessionType: input.sessionType,
      externalUrl: input.externalUrl || null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      durationMinutes: input.durationMinutes,
      status: input.status,
      lobbyOpensAt: input.scheduledAt
        ? new Date(new Date(input.scheduledAt).getTime() - 15 * 60_000)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(classSessions.id, sessionId))
    .returning();

  return updated;
}

export async function deleteClassSession(
  teacherId: string,
  sessionId: string
): Promise<void> {
  const ownership = await verifySessionOwnership(teacherId, sessionId);
  if (!ownership) throw new ClassSessionNotFoundError();

  const db = getDb();
  await db.delete(classSessions).where(eq(classSessions.id, sessionId));
}

export async function getTeacherSessionsForCourse(
  teacherId: string,
  courseId: string
): Promise<ClassSession[]> {
  const course = await verifyCourseOwnership(teacherId, courseId);
  if (!course) throw new ClassSessionNotFoundError();

  const db = getDb();
  return db
    .select({
      id: classSessions.id,
      courseId: classSessions.courseId,
      teacherId: classSessions.teacherId,
      title: classSessions.title,
      description: classSessions.description,
      sessionType: classSessions.sessionType,
      externalUrl: classSessions.externalUrl,
      scheduledAt: classSessions.scheduledAt,
      durationMinutes: classSessions.durationMinutes,
      status: classSessions.status,
      maxParticipants: classSessions.maxParticipants,
      lobbyOpensAt: classSessions.lobbyOpensAt,
      endedAt: classSessions.endedAt,
      roomDurableObjectId: classSessions.roomDurableObjectId,
      youtubeLiveVideoId: classSessions.youtubeLiveVideoId,
      youtubeReplayVideoId: classSessions.youtubeReplayVideoId,
      replayStatus: classSessions.replayStatus,
      classReminderSentAt: classSessions.classReminderSentAt,
      createdAt: classSessions.createdAt,
      updatedAt: classSessions.updatedAt,
    })
    .from(classSessions)
    .where(eq(classSessions.courseId, courseId))
    .orderBy(desc(classSessions.scheduledAt));
}

export async function getStudentSessionsForCourse(
  studentId: string,
  courseId: string
): Promise<ClassSession[]> {
  const db = getDb();
  const rows = await db
    .select({ session: classSessions })
    .from(classSessions)
    .innerJoin(courses, eq(classSessions.courseId, courses.id))
    .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(classSessions.courseId, courseId),
        eq(courses.status, "published"),
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, "active")
      )
    )
    .orderBy(desc(classSessions.scheduledAt));

  return rows.map((r) => r.session);
}

export async function getUpcomingSessionsForStudent(
  studentId: string
): Promise<ClassSession[]> {
  const db = getDb();
  const now = new Date();

  const rows = await db
    .select({ session: classSessions })
    .from(classSessions)
    .innerJoin(courses, eq(classSessions.courseId, courses.id))
    .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, "active"),
        eq(courses.status, "published"),
        eq(classSessions.status, "upcoming"),
        gte(classSessions.scheduledAt, now)
      )
    )
    .orderBy(asc(classSessions.scheduledAt));

  return rows.map((r) => r.session);
}

/**
 * Upcoming sessions owned by the given teacher across all their
 * courses. Used by the teacher dashboard "Today's classes" hero card
 * (R1 §6.2) and the upcoming-sessions list inside the class section.
 */
export async function getUpcomingSessionsForTeacher(
  teacherId: string
): Promise<ClassSession[]> {
  const db = getDb();
  const now = new Date();

  const rows = await db
    .select({ session: classSessions })
    .from(classSessions)
    .innerJoin(courses, eq(classSessions.courseId, courses.id))
    .where(
      and(
        eq(courses.teacherId, teacherId),
        eq(classSessions.status, "upcoming"),
        gte(classSessions.scheduledAt, now),
      ),
    )
    .orderBy(asc(classSessions.scheduledAt));

  return rows.map((r) => r.session);
}

export async function markSessionCompleted(
  teacherId: string,
  sessionId: string
): Promise<ClassSession> {
  const ownership = await verifySessionOwnership(teacherId, sessionId);
  if (!ownership) throw new ClassSessionNotFoundError();

  const db = getDb();
  const [updated] = await db
    .update(classSessions)
    .set({
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(classSessions.id, sessionId))
    .returning();

  return updated;
}

export async function cancelSession(
  teacherId: string,
  sessionId: string
): Promise<ClassSession> {
  const ownership = await verifySessionOwnership(teacherId, sessionId);
  if (!ownership) throw new ClassSessionNotFoundError();

  const db = getDb();
  const [updated] = await db
    .update(classSessions)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(classSessions.id, sessionId))
    .returning();

  return updated;
}

// ---------------------------------------------------------------------------
// R3 — Live class extensions
// ---------------------------------------------------------------------------

/**
 * R3 — Schedule a new live class session. Auto-derives `lobbyOpensAt`
 * (15 minutes before `scheduledAt`) and stores the owning teacher's id
 * for the DO. Backwards-compatible with `createClassSession` (kept for
 * older callers); prefer `scheduleLiveSession` going forward.
 */
export async function scheduleLiveSession(
  teacherId: string,
  input: CreateClassSessionInput & { maxParticipants?: number }
): Promise<ClassSession> {
  const course = await verifyCourseOwnership(teacherId, input.courseId);
  if (!course) throw new ClassSessionNotFoundError();

  const db = getDb();
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
  const [session] = await db
    .insert(classSessions)
    .values({
      courseId: input.courseId,
      teacherId,
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      sessionType: "live",
      externalUrl: input.externalUrl || null,
      scheduledAt,
      durationMinutes: input.durationMinutes,
      status: "upcoming",
      maxParticipants: input.maxParticipants ?? 200,
      lobbyOpensAt: scheduledAt
        ? new Date(scheduledAt.getTime() - 15 * 60_000)
        : null,
    })
    .returning();

  await createCourseNotifications(input.courseId, {
    type: "class_session",
    title: `New Live Class: ${session.title}`,
    body: scheduledAt
      ? `Live class scheduled for ${scheduledAt.toLocaleString()}. Join 15 minutes before start.`
      : "A new live class has been scheduled.",
    link: "/student/notifications",
  });

  return session;
}

/**
 * R3 — Finalize a session. Called from the API route after the teacher's
 * "end class" action; the DO has already flushed attendance/chat. We mark
 * the row completed, set `ended_at`, and emit the replay-ready
 * notification via NOTIFICATIONS_QUEUE.
 */
export async function finalizeSession(
  teacherId: string,
  sessionId: string,
  options?: { youtubeReplayVideoId?: string }
): Promise<ClassSession> {
  const ownership = await verifySessionOwnership(teacherId, sessionId);
  if (!ownership) throw new ClassSessionNotFoundError();

  const db = getDb();
  const patch: Partial<ClassSession> = {
    status: "completed",
    endedAt: new Date(),
    updatedAt: new Date(),
  };
  if (options?.youtubeReplayVideoId) {
    patch.youtubeReplayVideoId = options.youtubeReplayVideoId;
    patch.replayStatus = "available";
  }
  const [updated] = await db
    .update(classSessions)
    .set(patch)
    .where(eq(classSessions.id, sessionId))
    .returning();

  await enqueue<{
    type: string;
    sessionId: string;
    courseId: string;
    title: string;
    hasReplay: boolean;
  }>("NOTIFICATIONS_QUEUE", {
    type: "class.replay_ready",
    id: `class.replay_ready:${sessionId}:${Date.now()}`,
    payload: {
      type: "class.replay_ready",
      sessionId,
      courseId: updated.courseId,
      title: updated.title,
      hasReplay: Boolean(options?.youtubeReplayVideoId),
    },
  });

  return updated;
}

/**
 * R3 — Mark replay ready (separate from end). Lets the teacher end the
 * live class first, then upload the YouTube VOD separately and come back
 * to mark it ready.
 */
export async function markRecordingReady(
  teacherId: string,
  sessionId: string,
  youtubeReplayVideoId: string
): Promise<ClassSession> {
  const ownership = await verifySessionOwnership(teacherId, sessionId);
  if (!ownership) throw new ClassSessionNotFoundError();

  const db = getDb();
  const [updated] = await db
    .update(classSessions)
    .set({
      youtubeReplayVideoId,
      replayStatus: "available",
      updatedAt: new Date(),
    })
    .where(eq(classSessions.id, sessionId))
    .returning();

  await enqueue<{
    type: string;
    sessionId: string;
    courseId: string;
    title: string;
  }>("NOTIFICATIONS_QUEUE", {
    type: "class.replay_ready",
    id: `class.replay_ready:${sessionId}:${Date.now()}`,
    payload: {
      type: "class.replay_ready",
      sessionId,
      courseId: updated.courseId,
      title: updated.title,
    },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// R3 — Routine + iCal export
// ---------------------------------------------------------------------------

export type RoutineCell = {
  sessionId: string;
  courseId: string;
  courseTitle: string;
  title: string;
  scheduledAt: Date;
  durationMinutes: number | null;
  status: ClassSession["status"];
  youtubeLiveVideoId: string | null;
  youtubeReplayVideoId: string | null;
  replayStatus: ClassSession["replayStatus"];
};

/**
 * R3 — Mon–Sun routine cells for the requested week. `weekStart` is a
 * Date pointing at 00:00 of the Monday in the user's locale. Returns
 * sessions sorted by `scheduledAt` ascending.
 */
export async function getRoutineForUser(
  userId: string,
  role: "student" | "teacher",
  weekStart: Date
): Promise<RoutineCell[]> {
  const db = getDb();
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const baseSelect = {
    sessionId: classSessions.id,
    courseId: classSessions.courseId,
    courseTitle: courses.title,
    title: classSessions.title,
    scheduledAt: classSessions.scheduledAt,
    durationMinutes: classSessions.durationMinutes,
    status: classSessions.status,
    youtubeLiveVideoId: classSessions.youtubeLiveVideoId,
    youtubeReplayVideoId: classSessions.youtubeReplayVideoId,
    replayStatus: classSessions.replayStatus,
  };

  if (role === "teacher") {
    const rows = await db
      .select(baseSelect)
      .from(classSessions)
      .innerJoin(courses, eq(classSessions.courseId, courses.id))
      .where(
        and(
          eq(courses.teacherId, userId),
          gteOp(classSessions.scheduledAt, start),
          lte(classSessions.scheduledAt, end)
        )
      )
      .orderBy(asc(classSessions.scheduledAt));
    return rows.filter((r): r is RoutineCell => r.scheduledAt !== null);
  }

  const rows = await db
    .select(baseSelect)
    .from(classSessions)
    .innerJoin(courses, eq(classSessions.courseId, courses.id))
    .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(enrollments.studentId, userId),
        eq(enrollments.status, "active"),
        eq(courses.status, "published"),
        gteOp(classSessions.scheduledAt, start),
        lte(classSessions.scheduledAt, end)
      )
    )
    .orderBy(asc(classSessions.scheduledAt));
  return rows.filter((r): r is RoutineCell => r.scheduledAt !== null);
}

export type IcalEvent = {
  uid: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  url?: string;
  location?: string;
};

/**
 * R3 — Build an RFC 5545 ICS feed for the user's enrolled (or owned)
 * class sessions. Returns the ICS string ready to serve with
 * `Content-Type: text/calendar`.
 */
export async function buildIcalForUser(
  userId: string,
  role: "student" | "teacher"
): Promise<string> {
  const db = getDb();
  const now = new Date();

  const baseSelect = {
    sessionId: classSessions.id,
    courseId: classSessions.courseId,
    courseTitle: courses.title,
    title: classSessions.title,
    description: classSessions.description,
    scheduledAt: classSessions.scheduledAt,
    durationMinutes: classSessions.durationMinutes,
  };

  const sessions =
    role === "teacher"
      ? (
          await db
            .select(baseSelect)
            .from(classSessions)
            .innerJoin(courses, eq(classSessions.courseId, courses.id))
            .where(
              and(
                eq(courses.teacherId, userId),
                gteOp(classSessions.scheduledAt, now)
              )
            )
            .orderBy(asc(classSessions.scheduledAt))
        ).map((r) => ({ ...r, url: null as string | null }))
      : (
          await db
            .select({
              ...baseSelect,
              teacherId: courses.teacherId,
            })
            .from(classSessions)
            .innerJoin(courses, eq(classSessions.courseId, courses.id))
            .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
            .where(
              and(
                eq(enrollments.studentId, userId),
                eq(enrollments.status, "active"),
                eq(courses.status, "published"),
                gteOp(classSessions.scheduledAt, now)
              )
            )
            .orderBy(asc(classSessions.scheduledAt))
        );

  const events: IcalEvent[] = sessions
    .filter((s) => s.scheduledAt)
    .map((s) => {
      const start = new Date(s.scheduledAt as Date);
      const end = new Date(
        start.getTime() + (s.durationMinutes ?? 60) * 60_000
      );
      return {
        uid: `${s.sessionId}@insidejibon`,
        summary: `${s.courseTitle}: ${s.title}`,
        description: s.description ?? "",
        start,
        end,
        location:
          role === "teacher"
            ? `/teacher/courses/${s.courseId}/live/${s.sessionId}`
            : `/student/courses/${s.courseId}/live/${s.sessionId}`,
      };
    });

  return renderIcs(events, {
    prodId: `-//InsideJibon//Live Class Roster//EN`,
    name:
      role === "teacher"
        ? "InsideJibon Teaching Schedule"
        : "InsideJibon Class Schedule",
  });
}

/**
 * Minimal RFC 5545 renderer. We emit the minimum required for Google
 * Calendar / Apple Calendar to parse:
 *   BEGIN:VCALENDAR / VERSION / PRODID / CALSCALE / METHOD
 *   BEGIN:VEVENT / UID / DTSTAMP / DTSTART / DTEND / SUMMARY /
 *   DESCRIPTION / LOCATION / END:VEVENT
 *   END:VCALENDAR
 */
export function renderIcs(
  events: IcalEvent[],
  meta: { prodId: string; name: string }
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${meta.prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${meta.name}`,
  ];
  const stamp = formatIcsDate(new Date());
  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${formatIcsDate(ev.start)}`);
    lines.push(`DTEND:${formatIcsDate(ev.end)}`);
    lines.push(`SUMMARY:${escapeIcs(ev.summary)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeIcs(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeIcs(ev.location)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

function escapeIcs(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** YYYYMMDDTHHMMSSZ (UTC) — RFC 5545 date-time form. */
function formatIcsDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

// ---------------------------------------------------------------------------
// R3 — 15-minute-before reminder producer
// ---------------------------------------------------------------------------

/**
 * Scans for upcoming class sessions whose lobby has opened and whose
 * scheduled start is within `windowMinutes` (default 15). For each match,
 * emits a `class.reminder` notification (in-app + queue) and a matching
 * email reminder, then sets `class_reminder_sent_at` so the next tick
 * will skip it.
 *
 * Called from the energy-refill Cron Trigger every 5 minutes. Cloudflare's
 * Free plan is capped at 5 cron slots per Worker; piggy-backing avoids
 * burning a slot on this single-purpose tick.
 *
 * Returns the number of reminders dispatched.
 */
export async function emitClassReminders(
  windowMinutes = 15,
  now = new Date()
): Promise<number> {
  const db = getDb();
  const windowMs = windowMinutes * 60_000;
  const upper = new Date(now.getTime() + windowMs);
  const lower = new Date(now.getTime() - 60_000); // tiny back-date so we don't miss sessions whose lobby just opened

  const rows = await db
    .select({
      sessionId: classSessions.id,
      courseId: classSessions.courseId,
      title: classSessions.title,
      scheduledAt: classSessions.scheduledAt,
      courseTitle: courses.title,
    })
    .from(classSessions)
    .innerJoin(courses, eq(classSessions.courseId, courses.id))
    .where(
      and(
        gteOp(classSessions.scheduledAt, lower),
        lte(classSessions.scheduledAt, upper),
        eq(classSessions.status, "upcoming"),
        // Reminder only fires once per session.
        isNull(classSessions.classReminderSentAt)
      )
    )
    .limit(200);

  if (rows.length === 0) return 0;

  // Set the gate first so concurrent cron ticks can't double-fire.
  for (const row of rows) {
    try {
      await db
        .update(classSessions)
        .set({ classReminderSentAt: now })
        .where(eq(classSessions.id, row.sessionId));
    } catch {
      /* best effort — we'll still emit and tolerate a duplicate reminder */
    }
  }

  for (const row of rows) {
    const payload = {
      type: "class.reminder" as const,
      sessionId: row.sessionId,
      courseId: row.courseId,
      title: row.title,
      courseTitle: row.courseTitle,
      scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
    };

    // In-app notifications fan out to enrolled students.
    await createCourseNotifications(row.courseId, {
      type: "class_session",
      title: `Class starting soon — ${row.title}`,
      body: `${row.courseTitle} starts in ~${windowMinutes} minutes.`,
      link: `/student/courses/${row.courseId}/live/${row.sessionId}`,
    }).catch(() => undefined);

    // Email + push fan-out goes through the worker queue.
    await enqueue<typeof payload>("NOTIFICATIONS_QUEUE", {
      type: payload.type,
      id: `class.reminder:${row.sessionId}:${payload.scheduledAt ?? ""}`,
      payload,
    }).catch(() => undefined);
  }

  return rows.length;
}
