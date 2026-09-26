import Link from "next/link";

import { requireUser } from "@/lib/permissions";
import {
  getUserRank,
  getWeeklyLeaderboard,
  type LeaderboardScopeKind,
  weekStartFor,
} from "@/services/leaderboard";
import { getCurrentLeague, getLeagueCohort } from "@/services/gamification/leagues";
import { getTranslator } from "@/i18n/server";
import { isUuid } from "@/services/qna/threads";
import { getDb } from "@/db";
import { courses, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * R4 Leaderboard — top 20 students by XP earned this week. Two scopes:
 *   - 'global' (default): across the platform
 *   - 'course': for a specific course the user has access to
 *   - 'league': R5 — current league cohort (Bronze/Silver/Gold/Diamond)
 *
 * Implementation notes:
 *   - Reads `leaderboard_snapshots` first; falls back to a live aggregate
 *     over `xp_events` (cheap; weekly window + GIN/btree indexes).
 *   - Cron Trigger at hh:13 every 2 hours (`wrangler.jsonc`) refreshes
 *     the snapshot for both global/course scopes in the background.
 *     The cron at 59 23 * * 0 (Sun 23:59) refreshes the weekly
 *     league_members table — used by the 'league' tab.
 *   - Top-3 podium, ranks 4-20, then "your rank" link if outside the
 *     top 20. No charting libraries — Academic Modernism prefers text.
 */
export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    courseId?: string;
    view?: "global" | "league";
  }>;
}) {
  const user = await requireUser();
  const t = await getTranslator();
  const params = await searchParams;

  const viewKind: "global" | "league" = params.view === "league" ? "league" : "global";
  const isLeague = viewKind === "league";
  const scopeKind: LeaderboardScopeKind = params.courseId ? "course" : "global";
  const courseId = params.courseId && isUuid(params.courseId) ? params.courseId : null;

  // Resolve a human-friendly course title for the per-course scope.
  let courseTitle: string | null = null;
  if (courseId) {
    const db = getDb();
    const [row] = await db
      .select({ id: courses.id, title: courses.title })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);
    courseTitle = row?.title ?? null;
  }

  const weekStart = weekStartFor();

  if (viewKind === "league") {
    return (
      <LeagueTab
        user={user}
        weekStart={weekStart}
        t={t}
      />
    );
  }

  const [board, rank] = await Promise.all([
    getWeeklyLeaderboard({
      scopeKind,
      scopeId: courseId,
      weekStart,
      limit: 20,
    }),
    getUserRank({
      userId: user.id,
      scopeKind,
      scopeId: courseId,
      weekStart,
    }),
  ]);

  const weekIso = board.weekStart;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-wide text-secondary">
          {t("leaderboard.weeklyWeek", { date: weekIso })}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-on-surface">
          {t("leaderboard.title")}
        </h1>
        <p className="mt-2 text-sm text-secondary">
          {courseId
            ? courseTitle ?? t("leaderboard.subtitle.course")
            : t("leaderboard.subtitle.global")}
        </p>
      </header>

      <nav
        aria-label="Leaderboard view"
        className="mb-6 inline-flex rounded-full border border-outline-variant bg-surface-container-lowest p-1 text-sm"
      >
        <ViewTab
          href="/leaderboard"
          active={!isLeague}
          label={t("leaderboard.view.global")}
        />
        <ViewTab
          href="/leaderboard?view=league"
          active={isLeague}
          label={t("leaderboard.view.league")}
        />
        {courseId ? (
          <ViewTab
            href={`/leaderboard?courseId=${courseId}`}
            active={true}
            label={courseTitle ?? t("leaderboard.scope.course")}
          />
        ) : null}
      </nav>

      {board.entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
          <p className="text-base font-semibold text-on-surface">
            {t("leaderboard.empty.title")}
          </p>
          <p className="mt-1 text-sm text-secondary">
            {t("leaderboard.empty.description")}
          </p>
        </div>
      ) : (
        <LeaderboardList
          entries={board.entries}
          currentUserId={user.id}
          podiumLabels={{
            first: t("leaderboard.podium.first"),
            second: t("leaderboard.podium.second"),
            third: t("leaderboard.podium.third"),
          }}
          rankLabel={t("leaderboard.row.rank")}
          studentLabel={t("leaderboard.row.student")}
          xpLabel={t("leaderboard.row.xp")}
        />
      )}

      {rank && rank.rank > 20 ? (
        <p className="mt-6 text-center text-sm font-medium text-secondary">
          {t("leaderboard.yourRank", { rank: rank.rank, total: rank.total })}{" "}
          <span className="text-on-surface-variant">
            ({t("leaderboard.yourXp", { xp: rank.xp })})
          </span>
        </p>
      ) : null}

      <p className="mt-4 text-center text-xs text-outline">
        {t("leaderboard.lastUpdated", {
          when: new Date(board.computedAt).toLocaleString(),
        })}
      </p>
    </main>
  );
}

async function LeagueTab({
  user,
  weekStart,
  t,
}: {
  user: { id: string };
  weekStart: Date;
  t: Awaited<ReturnType<typeof getTranslator>>;
}) {
  const [self, cohort] = await Promise.all([
    getCurrentLeague(user.id, weekStart),
    getLeagueCohort({ userId: user.id, weekStart, limit: 50 }),
  ]);

  // Fetch display names for cohort members in one query.
  const userIds = cohort.cohort.map((c) => c.userId);
  const nameById = new Map<string, { name: string | null; email: string }>();
  if (userIds.length > 0) {
    const db = getDb();
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(inArray(users.id, userIds));
    for (const r of rows) {
      nameById.set(r.id, { name: r.name, email: r.email });
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-wide text-secondary">
          {t("leaderboard.weeklyWeek", { date: weekStart.toISOString().slice(0, 10) })}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-on-surface">
          {t("leaderboard.league.title")}
        </h1>
        <p className="mt-2 text-sm text-secondary">
          {t("leaderboard.league.subtitle", {
            league: self?.league ? t(`gamification.league.${self.league}`) : "—",
            rank: self?.rank ?? "—",
            total: cohort.cohort.length,
          })}
        </p>
      </header>

      <nav
        aria-label="Leaderboard view"
        className="mb-6 inline-flex rounded-full border border-outline-variant bg-surface-container-lowest p-1 text-sm"
      >
        <ViewTab href="/leaderboard" label={t("leaderboard.view.global")} active={false} />
        <ViewTab href="/leaderboard?view=league" label={t("leaderboard.view.league")} active />
      </nav>

      {cohort.cohort.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
          <p className="text-base font-semibold text-on-surface">
            {t("leaderboard.empty.title")}
          </p>
          <p className="mt-1 text-sm text-secondary">
            {t("leaderboard.league.emptyHint")}
          </p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-left text-xs font-medium uppercase tracking-wide text-secondary">
              <th className="py-2 pl-2">{t("leaderboard.row.rank")}</th>
              <th className="py-2">{t("leaderboard.row.student")}</th>
              <th className="py-2 pr-2 text-right">{t("leaderboard.row.xp")}</th>
              <th className="py-2 pr-2 text-right">{t("leaderboard.league.movement")}</th>
            </tr>
          </thead>
          <tbody>
            {cohort.cohort.map((entry) => {
              const meta = nameById.get(entry.userId);
              const isMe = entry.userId === user.id;
              return (
                <tr
                  key={entry.userId}
                  className={
                    isMe
                      ? "border-b border-outline-variant bg-primary-container/30"
                      : "border-b border-outline-variant"
                  }
                >
                  <td className="py-3 pl-2 font-mono font-bold text-on-surface">
                    #{entry.rank}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {(meta?.name ?? "U").charAt(0).toUpperCase()}
                      </span>
                      <span className="text-on-surface">{meta?.name ?? "Anonymous"}</span>
                      {isMe ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-on-primary">
                          You
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3 pr-2 text-right font-mono font-semibold text-on-surface">
                    {(entry.xp ?? 0).toLocaleString()}
                  </td>
                  <td className="py-3 pr-2 text-right font-mono text-xs text-secondary">
                    {isMe && self?.promoted ? "↑ promoted" : isMe && self?.relegated ? "↓ relegated" : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}

function ViewTab({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full bg-primary px-4 py-1.5 text-on-primary shadow-xs"
          : "rounded-full px-4 py-1.5 text-on-surface-variant hover:bg-surface-container-high"
      }
    >
      {label}
    </Link>
  );
}

function LeaderboardList({
  entries,
  currentUserId,
  podiumLabels,
  rankLabel,
  studentLabel,
  xpLabel,
}: {
  entries: Array<{
    userId: string;
    userName: string | null;
    userImage: string | null;
    userRole: import("@/db/schema").Role;
    xp: number;
    rank: number;
  }>;
  currentUserId: string;
  podiumLabels: { first: string; second: string; third: string };
  rankLabel: string;
  studentLabel: string;
  xpLabel: string;
}) {
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-8">
      {/* Podium */}
      <section
        aria-label="Top 3"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {[1, 0, 2].map((podiumIdx) => {
          const e = podium[podiumIdx];
          if (!e) return <div key={podiumIdx} />;
          const podiumLabel =
            podiumIdx === 0
              ? podiumLabels.first
              : podiumIdx === 1
                ? podiumLabels.second
                : podiumLabels.third;
          const tone =
            podiumIdx === 0
              ? "border-amber-300 bg-amber-50"
              : podiumIdx === 1
                ? "border-slate-300 bg-slate-50"
                : "border-orange-300 bg-orange-50";
          return (
            <article
              key={e.userId}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 ${tone} p-5 text-center`}
            >
              <span className="font-mono text-xs font-bold uppercase tracking-wide text-secondary">
                #{e.rank} · {podiumLabel}
              </span>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-on-primary">
                {(e.userName ?? "U").charAt(0).toUpperCase()}
              </span>
              <p className="text-sm font-semibold text-on-surface">
                {e.userName ?? "Anonymous"}
              </p>
              <p className="font-mono text-xs text-secondary">
                {e.xp.toLocaleString()} {xpLabel}
              </p>
              {e.userId === currentUserId ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-on-primary">
                  You
                </span>
              ) : null}
            </article>
          );
        })}
      </section>

      {/* Rest of top 20 */}
      {rest.length > 0 ? (
        <section aria-label={rankLabel}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-left text-xs font-medium uppercase tracking-wide text-secondary">
                <th className="py-2 pl-2">{rankLabel}</th>
                <th className="py-2">{studentLabel}</th>
                <th className="py-2 pr-2 text-right">{xpLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((e) => (
                <tr
                  key={e.userId}
                  className={
                    e.userId === currentUserId
                      ? "border-b border-outline-variant bg-primary-container/30"
                      : "border-b border-outline-variant"
                  }
                >
                  <td className="py-3 pl-2 font-mono font-bold text-on-surface">
                    #{e.rank}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {(e.userName ?? "U").charAt(0).toUpperCase()}
                      </span>
                      <span className="text-on-surface">
                        {e.userName ?? "Anonymous"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-2 text-right font-mono font-semibold text-on-surface">
                    {e.xp.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
