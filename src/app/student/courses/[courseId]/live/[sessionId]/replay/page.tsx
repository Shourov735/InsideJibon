import "server-only";

import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";

import { requireStudent } from "@/lib/permissions";
import { isUuid } from "@/lib/utils";
import { getDb } from "@/db";
import { classSessions, courses, enrollments } from "@/db/schema";
import { getTranslator } from "@/i18n/server";
import { authorizeReplayViewer, getReplayChat } from "@/services/classes";
import { ReplayPage } from "@/components/shared/live/replay-page";

interface PageProps {
  params: Promise<{ courseId: string; sessionId: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { courseId, sessionId } = await params;
  if (!isUuid(courseId) || !isUuid(sessionId)) {
    return { title: "Replay" };
  }
  const db = getDb();
  const [row] = await db
    .select({
      title: classSessions.title,
      courseTitle: courses.title,
    })
    .from(classSessions)
    .innerJoin(courses, eq(classSessions.courseId, courses.id))
    .where(eq(classSessions.id, sessionId))
    .limit(1);
  return {
    title: row ? `${row.title} · Replay · ${row.courseTitle}` : "Replay",
  };
}

/**
 * R3 — Student replay page.
 *
 * Shows the YouTube replay embed plus the chat transcript overlay
 * synced via `enablejsapi`. Attendance badge is currently a future
 * enhancement — the page renders without it for now.
 */
export default async function StudentReplayPage({ params }: PageProps) {
  const { courseId, sessionId } = await params;
  if (!isUuid(courseId) || !isUuid(sessionId)) notFound();
  const user = await requireStudent();

  const auth = await authorizeReplayViewer(sessionId, {
    id: user.id,
    role: "student",
  });
  if (!auth.ok || auth.role !== "student") notFound();

  // Validate URL ↔ DB alignment and active enrollment on this course.
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
  if (!row || row.session.courseId !== courseId) notFound();
  const enrolled = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, user.id),
        eq(enrollments.courseId, courseId),
        eq(enrollments.status, "active")
      )
    )
    .limit(1);
  if (enrolled.length === 0) notFound();

  const chat = await getReplayChat(sessionId);
  // Anchor chat timestamps to scheduledAt (best available) and the class end.
  const startedAt =
    row.session.scheduledAt?.toISOString() ??
    row.session.lobbyOpensAt?.toISOString() ??
    new Date().toISOString();
  const lastEventAt = row.session.endedAt?.toISOString() ?? new Date().toISOString();

  const t = await getTranslator();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
          {row.course.title}
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
          {row.session.title}
        </h1>
      </header>
      <ReplayPage
        locale={t.locale}
        sessionId={sessionId}
        courseId={courseId}
        courseTitle={row.course.title}
        sessionTitle={row.session.title}
        sessionDescription={row.session.description}
        scheduledAt={row.session.scheduledAt?.toISOString() ?? null}
        endedAt={row.session.endedAt?.toISOString() ?? null}
        embedUrl={
          row.session.youtubeReplayVideoId
            ? `https://www.youtube-nocookie.com/embed/${row.session.youtubeReplayVideoId}`
            : row.session.youtubeLiveVideoId
              ? `https://www.youtube-nocookie.com/embed/${row.session.youtubeLiveVideoId}`
              : null
        }
        replayStatus={row.session.replayStatus}
        chat={chat.map((m) => ({
          id: m.id,
          userId: m.userId,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        }))}
        reactions={[]}
        startedAt={startedAt}
        lastEventAt={lastEventAt}
      />
    </main>
  );
}
