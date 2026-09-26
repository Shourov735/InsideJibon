import "server-only";

import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";

import { requireStudent } from "@/lib/permissions";
import { isUuid } from "@/lib/utils";
import { getDb } from "@/db";
import { classSessions, courses, enrollments } from "@/db/schema";
import { getTranslator } from "@/i18n/server";
import { signClassroomTicket, encodeTicket } from "@/lib/live-ticket";
import { ClassroomRoom } from "@/components/shared/live/classroom-room";

interface PageProps {
  params: Promise<{ courseId: string; sessionId: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { courseId, sessionId } = await params;
  if (!isUuid(courseId) || !isUuid(sessionId)) {
    return { title: "Live Class" };
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
  if (!row || row.courseTitle === undefined) {
    return { title: "Live Class" };
  }
  // Re-check that the row actually matches the URL courseId.
  return {
    title: `${row.title} · Live · ${row.courseTitle}`,
  };
}

/**
 * R3 — Student in-room page.
 *
 * Mints a short-lived WebSocket ticket and mounts the shared
 * `<ClassroomRoom>` client. The DO handles presence / chat / reactions;
 * the stage is a `youtube-nocookie.com` iframe (see §5.2).
 */
export default async function StudentLiveRoomPage({ params }: PageProps) {
  const { courseId, sessionId } = await params;
  if (!isUuid(courseId) || !isUuid(sessionId)) notFound();
  const user = await requireStudent();

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

  // Authorization: student must have an active enrollment.
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

  // Mint a 5-minute ticket. The DO re-verifies the same ticket on
  // the first `presence.join` frame.
  const ticket = await signClassroomTicket({
    userId: user.id,
    sessionId,
    role: "student",
  });
  const encoded = encodeTicket(ticket);

  const t = await getTranslator();

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
          {row.course.title}
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
          {row.session.title}
        </h1>
      </header>
      <ClassroomRoom
        locale={t.locale}
        sessionId={sessionId}
        courseId={courseId}
        courseTitle={row.course.title}
        teacherName={row.course.teacherId ?? ""}
        ticket={ticket.sig}
        encodedTicket={encoded}
        initialYoutubeLiveVideoId={row.session.youtubeLiveVideoId}
        initialYoutubeReplayVideoId={row.session.youtubeReplayVideoId}
        initialReplayStatus={row.session.replayStatus}
        viewerRole="student"
        viewerId={user.id}
        viewerName={user.name ?? "Student"}
        teacherControls={false}
      />
    </main>
  );
}
