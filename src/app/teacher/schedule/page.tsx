import "server-only";

import { requireTeacher } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import { getRoutineForUser } from "@/services/classes";
import { ScheduleView } from "@/components/shared/live/schedule-view";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { CalendarIcon } from "@/components/shared/ui/icons";

export const dynamic = "force-dynamic";

/**
 * R3 — Teacher schedule.
 *
 * Mirrors the student variant but pulls sessions for courses the teacher
 * owns. Cells link to the teacher's lobby / replay routes.
 */
export default async function TeacherSchedulePage() {
  const user = await requireTeacher();
  const t = await getTranslator();

  const now = new Date();
  const weekStart = startOfWeek(now, 1);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const cells = await getRoutineForUser(user.id, "teacher", weekStart);

  return (
    <Container className="py-6 sm:py-8" size="xl">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <CalendarIcon size={14} />
            {t("schedule.nav")}
          </span>
        }
        title={t("schedule.weekOf", {
          date: new Intl.DateTimeFormat(t.locale === "bn" ? "bn-BD" : "en-US", {
            month: "short",
            day: "numeric",
          }).formatRange(weekStart, weekEnd),
        })}
        description={t("schedule.hostBadge")}
      />
      <div className="mt-6">
        <ScheduleView
          locale={t.locale}
          weekStartIso={weekStart.toISOString()}
          weekEndIso={weekEnd.toISOString()}
          viewerRole="teacher"
          cells={cells.map((c) => ({
            sessionId: c.sessionId,
            courseId: c.courseId,
            courseTitle: c.courseTitle,
            title: c.title,
            scheduledAt: c.scheduledAt.toISOString(),
            durationMinutes: c.durationMinutes,
            status: c.status,
            youtubeLiveVideoId: c.youtubeLiveVideoId,
            youtubeReplayVideoId: c.youtubeReplayVideoId,
            replayStatus: c.replayStatus,
          }))}
        />
      </div>
    </Container>
  );
}

function startOfWeek(d: Date, weekStartsOn: 1 | 0): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  out.setDate(out.getDate() - diff);
  return out;
}
