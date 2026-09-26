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
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { Tabs } from "@/components/shared/ui/tabs";
import { Badge } from "@/components/shared/ui/badge";
import { ResponsiveTable } from "@/components/shared/ui/responsive-table";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { Stat } from "@/components/shared/ui/stat";
import { TrophyIcon } from "@/components/shared/ui/icons";
import { cn } from "@/lib/utils";

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
        courseTitle={courseTitle}
        courseId={courseId}
        isLeague
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

  const viewTabs = [
    { value: "global", label: t("leaderboard.view.global"), href: "/leaderboard" },
    { value: "league", label: t("leaderboard.view.league"), href: "/leaderboard?view=league" },
  ];

  return (
    <Container className="py-6 sm:py-8" size="md">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <TrophyIcon size={14} />
            {t("leaderboard.weeklyWeek", { date: weekIso })}
          </span>
        }
        title={t("leaderboard.title")}
        description={
          courseId
            ? courseTitle ?? t("leaderboard.subtitle.course")
            : t("leaderboard.subtitle.global")
        }
        tabs={
          <Tabs items={viewTabs} value={isLeague ? "league" : "global"} />
        }
      />

      {board.entries.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<TrophyIcon size={20} />}
            title={t("leaderboard.empty.title")}
            description={t("leaderboard.empty.description")}
          />
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
        <p className="mt-6 text-center text-sm font-medium text-ink-500">
          {t("leaderboard.yourRank", { rank: rank.rank, total: rank.total })}{" "}
          <span className="text-ink-700">
            ({t("leaderboard.yourXp", { xp: rank.xp })})
          </span>
        </p>
      ) : null}

      <p className="mt-4 text-center text-xs text-ink-500">
        {t("leaderboard.lastUpdated", {
          when: new Date(board.computedAt).toLocaleString(),
        })}
      </p>
    </Container>
  );
}

async function LeagueTab({
  user,
  weekStart,
  t,
  courseTitle,
  courseId,
  isLeague,
}: {
  user: { id: string };
  weekStart: Date;
  t: Awaited<ReturnType<typeof getTranslator>>;
  courseTitle: string | null;
  courseId: string | null;
  isLeague: boolean;
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

  const viewTabs = [
    { value: "global", label: t("leaderboard.view.global"), href: "/leaderboard" },
    { value: "league", label: t("leaderboard.view.league"), href: "/leaderboard?view=league" },
  ];

  return (
    <Container className="py-6 sm:py-8" size="md">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <TrophyIcon size={14} />
            {t("leaderboard.weeklyWeek", {
              date: weekStart.toISOString().slice(0, 10),
            })}
          </span>
        }
        title={t("leaderboard.league.title")}
        description={t("leaderboard.league.subtitle", {
          league: self?.league ? t(`gamification.league.${self.league}`) : "—",
          rank: self?.rank ?? "—",
          total: cohort.cohort.length,
        })}
        tabs={<Tabs items={viewTabs} value={isLeague ? "league" : "global"} />}
      />

      {self?.league ? (
        <div className="mt-6">
          <Stat
            label={t("leaderboard.league.movement")}
            value={
              self.promoted
                ? "↑ Promoted"
                : self.relegated
                  ? "↓ Relegated"
                  : t("leaderboard.league.settled")
            }
            icon={<TrophyIcon size={18} />}
            tone={self.promoted ? "success" : self.relegated ? "warning" : "neutral"}
          />
        </div>
      ) : null}

      {cohort.cohort.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<TrophyIcon size={20} />}
            title={t("leaderboard.empty.title")}
            description={t("leaderboard.league.emptyHint")}
          />
        </div>
      ) : (
        <div className="mt-6">
          <ResponsiveTable
            columns={[
              {
                header: t("leaderboard.row.rank"),
                mobileLabel: t("leaderboard.row.rank"),
                cell: (e) => (
                  <span className="font-mono font-bold text-ink-900">#{e.rank}</span>
                ),
              },
              {
                header: t("leaderboard.row.student"),
                mobileLabel: t("leaderboard.row.student"),
                mobilePrimary: true,
                cell: (e) => {
                  const isMe = e.userId === user.id;
                  return (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-primary">
                        {e.displayName.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-ink-900">{e.displayName}</span>
                      {isMe ? (
                        <Badge tone="primary" size="xs">You</Badge>
                      ) : null}
                    </div>
                  );
                },
              },
              {
                header: t("leaderboard.row.xp"),
                mobileLabel: t("leaderboard.row.xp"),
                className: "text-right",
                mobileClassName: "text-right",
                cell: (e) => (
                  <span className="font-mono font-semibold text-ink-900">
                    {(e.xp ?? 0).toLocaleString()}
                  </span>
                ),
              },
            ]}
            rows={cohort.cohort.map((entry) => {
              const meta = nameById.get(entry.userId);
              return {
                ...entry,
                displayName: meta?.name ?? "Anonymous",
              };
            })}
            rowKey={(r) => r.userId}
            mobileLeading={(r) => (
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                  {r.displayName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {r.displayName}
                  </p>
                  <p className="text-xs text-ink-500">#{r.rank} this week</p>
                </div>
              </div>
            )}
            mobileTrailing={(r) => (
              <Badge tone="warning" size="sm">
                {(r.xp ?? 0).toLocaleString()} XP
              </Badge>
            )}
          />
        </div>
      )}

      {courseId && courseTitle ? (
        <p className="mt-4 text-center text-xs text-ink-500">
          {courseTitle}
        </p>
      ) : null}
    </Container>
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
    <div className="space-y-6 sm:space-y-8">
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
              ? "border-amber-300 bg-gradient-to-b from-amber-50 to-surface-0"
              : podiumIdx === 1
                ? "border-slate-300 bg-gradient-to-b from-slate-50 to-surface-0"
                : "border-orange-300 bg-gradient-to-b from-orange-50 to-surface-0";
          return (
            <article
              key={e.userId}
              className={cn(
                "flex flex-col items-center gap-2 rounded-3xl border-2 p-5 text-center",
                tone,
              )}
            >
              <span className="text-micro font-bold uppercase tracking-wide text-ink-500">
                #{e.rank} · {podiumLabel}
              </span>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-on-primary">
                {(e.userName ?? "U").charAt(0).toUpperCase()}
              </span>
              <p className="text-sm font-semibold text-ink-900">
                {e.userName ?? "Anonymous"}
              </p>
              <p className="text-xs text-ink-500">
                {e.xp.toLocaleString()} {xpLabel}
              </p>
              {e.userId === currentUserId ? (
                <Badge tone="primary" size="xs">You</Badge>
              ) : null}
            </article>
          );
        })}
      </section>

      {/* Rest of top 20 */}
      {rest.length > 0 ? (
        <section aria-label={rankLabel}>
          <ResponsiveTable
            columns={[
              {
                header: rankLabel,
                mobileLabel: rankLabel,
                cell: (e) => (
                  <span className="font-mono font-bold text-ink-900">#{e.rank}</span>
                ),
              },
              {
                header: studentLabel,
                mobileLabel: studentLabel,
                mobilePrimary: true,
                cell: (e) => {
                  const isMe = e.userId === currentUserId;
                  return (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-primary">
                        {e.displayName.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-ink-900">{e.displayName}</span>
                      {isMe ? (
                        <Badge tone="primary" size="xs">You</Badge>
                      ) : null}
                    </div>
                  );
                },
              },
              {
                header: xpLabel,
                mobileLabel: xpLabel,
                className: "text-right",
                mobileClassName: "text-right",
                cell: (e) => (
                  <span className="font-mono font-semibold text-ink-900">
                    {e.xp.toLocaleString()}
                  </span>
                ),
              },
            ]}
            rows={rest.map((e) => ({ ...e, displayName: e.userName ?? "Anonymous" }))}
            rowKey={(r) => r.userId}
            mobileLeading={(r) => (
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                  {r.displayName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {r.displayName}
                  </p>
                  <p className="text-xs text-ink-500">#{r.rank} this week</p>
                </div>
              </div>
            )}
            mobileTrailing={(r) => (
              <Badge tone="warning" size="sm">
                {r.xp.toLocaleString()} XP
              </Badge>
            )}
          />
        </section>
      ) : null}
    </div>
  );
}
