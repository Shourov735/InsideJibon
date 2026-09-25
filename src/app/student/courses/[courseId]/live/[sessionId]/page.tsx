import "server-only";

import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";

import { requireStudent } from "@/lib/permissions";
import { getDb } from "@/db";
import { classSessions, courses, enrollments } from "@/db/schema";
import { isUuid } from "@/lib/utils";
import { getTranslator } from "@/i18n/server";
import { StudentLiveLobby } from "@/components/student/live/student-live-lobby";

interface PageProps {
  params: Promise<{ courseId: string; sessionId: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { courseId, sessionId } = await params;
  if (!isUuid(courseId) || !isUuid(sessionId)) return { title: "Live Class" };
  const db = getDb();
  const [row] = await db
    .select({ title: classSessions.title, courseTitle: courses.title })
    .from(classSessions)
    .innerJoin(courses, eq(classSessions.courseId, courses.id))
    .where(eq(classSessions.id, sessionId))
    .limit(1);
  return {
    title: row ? `${row.title} · ${row.courseTitle}` : "Live Class",
  };
}

export default async function StudentLiveLobbyPage({ params }: PageProps) {
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

  const t = await getTranslator();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <StudentLiveLobby
        locale={t.locale}
        session={{
          id: row.session.id,
          courseId: row.session.courseId,
          title: row.session.title,
          description: row.session.description,
          scheduledAt: row.session.scheduledAt
            ? row.session.scheduledAt.toISOString()
            : null,
          durationMinutes: row.session.durationMinutes,
          status: row.session.status,
          lobbyOpensAt: row.session.lobbyOpensAt
            ? row.session.lobbyOpensAt.toISOString()
            : null,
          endedAt: row.session.endedAt
            ? row.session.endedAt.toISOString()
            : null,
          youtubeLiveVideoId: row.session.youtubeLiveVideoId,
          youtubeReplayVideoId: row.session.youtubeReplayVideoId,
          replayStatus: row.session.replayStatus,
        }}
        course={{
          id: row.course.id,
          title: row.course.title,
          teacherName: row.course.teacherId,
        }}
        viewer={{
          id: user.id,
          name: user.name,
          role: "student",
        }}
      />
    </main>
  );
}
