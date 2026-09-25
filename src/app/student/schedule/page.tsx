import "server-only";

import { requireStudent } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import { getRoutineForUser } from "@/services/classes";
import { ScheduleView } from "@/components/shared/live/schedule-view";

export const dynamic = "force-dynamic";

/**
 * R3 — Student schedule.
 *
 * Resolves the Monday of "this week" (locale-naive — we just use the
 * server's local Monday) and feeds it to `getRoutineForUser`. The view
 * shows Mon–Sun cells; each class links to either the lobby or the
 * replay. The "Export iCal" CTA points to `/api/live/ical`.
 */
export default async function StudentSchedulePage() {
  const user = await requireStudent();
  const t = await getTranslator();

  const now = new Date();
  const weekStart = startOfWeek(now, 1); // Mon=1 (Sunday=0)
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const cells = await getRoutineForUser(user.id, "student", weekStart);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
          {t("schedule.nav")}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-on-surface">
          {t("schedule.weekOf", {
            date: new Intl.DateTimeFormat(t.locale === "bn" ? "bn-BD" : "en-US", {
              month: "short",
              day: "numeric",
            }).formatRange(weekStart, weekEnd),
          })}
        </h1>
        <p className="text-sm text-secondary">{t("schedule.studentBadge")}</p>
      </header>
      <ScheduleView
        locale={t.locale}
        weekStartIso={weekStart.toISOString()}
        weekEndIso={weekEnd.toISOString()}
        viewerRole="student"
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
    </main>
  );
}

/** Returns Mon 00:00 local of the week containing `d`. JS Sunday=0. */
function startOfWeek(d: Date, weekStartsOn: 1 | 0): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  out.setDate(out.getDate() - diff);
  return out;
}
