import "server-only";

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { requireTeacher } from "@/lib/permissions";
import { isUuid } from "@/lib/utils";
import { getDb } from "@/db";
import { classSessions, courses } from "@/db/schema";
import { getTranslator } from "@/i18n/server";
import { authorizeReplayViewer, getReplayChat } from "@/services/classes";
import { ReplayPage } from "@/components/shared/live/replay-page";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { VideoIcon } from "@/components/shared/ui/icons";

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
    title: row ? `${row.title} · Host Replay · ${row.courseTitle}` : "Replay",
  };
}

/**
 * R3 — Teacher replay page.
 *
 * Mirrors the student variant but with `requireTeacher()` and an
 * ownership check (session → course → teacherId). Teachers see the
 * same `<ReplayPage>` UI; future enhancements: per-student attendance
 * legend, post-class Q&A summary.
 */
export default async function TeacherReplayPage({ params }: PageProps) {
  const { courseId, sessionId } = await params;
  if (!isUuid(courseId) || !isUuid(sessionId)) notFound();
  const user = await requireTeacher();

  const auth = await authorizeReplayViewer(sessionId, {
    id: user.id,
    role: "teacher",
  });
  if (!auth.ok || auth.role !== "teacher") notFound();

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
  if (row.course.teacherId !== user.id) notFound();

  const chat = await getReplayChat(sessionId);
  const startedAt =
    row.session.scheduledAt?.toISOString() ??
    row.session.lobbyOpensAt?.toISOString() ??
    new Date().toISOString();
  const lastEventAt = row.session.endedAt?.toISOString() ?? new Date().toISOString();

  const t = await getTranslator();

  return (
    <Container className="py-6 sm:py-8" size="xl">
      <PageHeader
        size="compact"
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <VideoIcon size={14} />
            {row.course.title}
          </span>
        }
        title={row.session.title}
        description="Host replay"
      />
      <div className="mt-6">
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
      </div>
    </Container>
  );
}
