import "server-only";

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { requireTeacher } from "@/lib/permissions";
import { isUuid } from "@/lib/utils";
import { getDb } from "@/db";
import { classSessions, courses } from "@/db/schema";
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
  return {
    title: row ? `${row.title} · Host · ${row.courseTitle}` : "Live Class",
  };
}

/**
 * R3 — Teacher in-room page.
 *
 * The host gets the same `<ClassroomRoom>` UI as the student but with
 * `teacherControls={true}` (Start YouTube Live, Mark Replay, End class).
 * Ownership is enforced via `course.teacherId === user.id`, matching
 * the chain used by the API route.
 */
export default async function TeacherLiveRoomPage({ params }: PageProps) {
  const { courseId, sessionId } = await params;
  if (!isUuid(courseId) || !isUuid(sessionId)) notFound();
  const user = await requireTeacher();

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

  // Ownership: the teacher must own the course.
  if (row.course.teacherId !== user.id) notFound();

  // Mint a 5-minute ticket (same shape as the student variant).
  const ticket = await signClassroomTicket({
    userId: user.id,
    sessionId,
    role: "teacher",
  });
  const encoded = encodeTicket(ticket);

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
        <p className="text-xs text-secondary">{t("live.room.hostBadge")}</p>
      </header>
      <ClassroomRoom
        locale={t.locale}
        sessionId={sessionId}
        courseId={courseId}
        courseTitle={row.course.title}
        teacherName={user.name ?? "Teacher"}
        ticket={ticket.sig}
        encodedTicket={encoded}
        initialYoutubeLiveVideoId={row.session.youtubeLiveVideoId}
        initialYoutubeReplayVideoId={row.session.youtubeReplayVideoId}
        initialReplayStatus={row.session.replayStatus}
        viewerRole="teacher"
        viewerId={user.id}
        viewerName={user.name ?? "Teacher"}
        teacherControls
      />
    </main>
  );
}
