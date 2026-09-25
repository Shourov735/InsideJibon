import "server-only";

import { and, desc, eq, gte, lt, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  leagueMembers,
  xpEvents,
  type LeagueMember,
  type LeagueTier,
} from "@/db/schema";
import { weekStartFor } from "@/services/leaderboard";

/**
 * R5 — League service.
 *
 * Sunday 23:59 UTC cron reads the *previous week's* XP totals, ranks
 * users, partitions them into cohorts, and writes this week's
 * `league_members` rows. Promotion / relegation are computed by
 * comparing each user's cohort to last week's.
 *
 * Note: we run on the *upcoming* week so dashboards show this week's
 * standing immediately. Promotion is awarded on Sunday before the new
 * week starts; Monday morning everyone sees their new cohort.
 */

const COHORTS: ReadonlyArray<{ tier: LeagueTier; topPercent: number }> = [
  { tier: "diamond", topPercent: 0.02 },
  { tier: "gold", topPercent: 0.1 },
  { tier: "silver", topPercent: 0.3 },
  { tier: "bronze", topPercent: 1.0 },
];

interface UserXp {
  userId: string;
  xp: number;
}

/**
 * Computes the league membership for a given week based on the XP
 * earned during the *previous* week. Writes (week_start, user_id)
 * rows in `league_members` and updates existing ones via UPSERT.
 *
 * Returns the count of users placed.
 */
export async function computeWeeklyLeagues(
  targetWeek: Date = nextWeekStart()
): Promise<{ placed: number }> {
  const db = getDb();
  const previousWeek = previousWeekStart(targetWeek);

  const weekStart = previousWeek;
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  // Aggregate XP per user for the previous week.
  const rows = await db
    .select({
      userId: xpEvents.userId,
      xp: sql<number>`COALESCE(SUM(${xpEvents.amount}), 0)::int`,
    })
    .from(xpEvents)
    .where(
      and(
        gte(xpEvents.createdAt, weekStart),
        lt(xpEvents.createdAt, weekEnd)
      )
    )
    .groupBy(xpEvents.userId);

  const ranked = rank(rows);

  // Pull last week's cohorts for promotion/relegation comparison.
  const lastWeekRows = await db
    .select({
      userId: leagueMembers.userId,
      league: leagueMembers.league,
    })
    .from(leagueMembers)
    .where(eq(leagueMembers.weekStart, isoDay(weekStart)));

  const lastLeagueByUser = new Map<string, LeagueTier>(
    lastWeekRows.map((r) => [r.userId, r.league])
  );

  // Wipe any pre-existing rows for this week so the UPSERT below is
  // idempotent. We keep the old rows in case the cron is re-run for
  // the same week — they'll be overwritten.
  await db
    .delete(leagueMembers)
    .where(eq(leagueMembers.weekStart, isoDay(targetWeek)));

  if (ranked.length === 0) return { placed: 0 };

  // Partition by cohort (top X% → Diamond, then Gold, then Silver,
  // then Bronze). We assign by absolute rank percentile against the
  // *ranked* list.
  const total = ranked.length;
  const cohortCounts = {
    diamond: Math.max(1, Math.floor(total * COHORTS[0].topPercent)),
    gold: Math.max(1, Math.floor(total * COHORTS[1].topPercent)),
    silver: Math.max(1, Math.floor(total * COHORTS[2].topPercent)),
    bronze: Math.max(0, total),
  };

  const placements: LeagueMember[] = [];
  for (let i = 0; i < ranked.length; i++) {
    const r = ranked[i];
    const rank = i + 1;
    let tier: LeagueTier;
    if (rank <= cohortCounts.diamond) tier = "diamond";
    else if (rank <= cohortCounts.diamond + cohortCounts.gold) tier = "gold";
    else if (
      rank <=
      cohortCounts.diamond + cohortCounts.gold + cohortCounts.silver
    )
      tier = "silver";
    else tier = "bronze";

    const previousTier = lastLeagueByUser.get(r.userId) ?? null;
    const promoted = previousTier != null && previousTier !== tier && betterTier(tier, previousTier);
    const relegated = previousTier != null && previousTier !== tier && !betterTier(tier, previousTier);

    placements.push({
      weekStart: isoDay(targetWeek),
      userId: r.userId,
      league: tier,
      rank,
      xp: r.xp,
      promoted: promoted ?? false,
      relegated: relegated ?? false,
      createdAt: new Date(),
    });
  }

  // Bulk insert in chunks of 100 to keep individual statements small.
  for (let i = 0; i < placements.length; i += 100) {
    const slice = placements.slice(i, i + 100);
    await db.insert(leagueMembers).values(slice);
  }

  return { placed: placements.length };
}

function betterTier(a: LeagueTier, b: LeagueTier): boolean {
  const order: LeagueTier[] = ["bronze", "silver", "gold", "diamond"];
  return order.indexOf(a) > order.indexOf(b);
}

function rank(rows: Array<{ userId: string; xp: number | null }>): UserXp[] {
  return [...rows]
    .map((r) => ({ userId: r.userId, xp: r.xp ?? 0 }))
    .sort((a, b) => b.xp - a.xp);
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nextWeekStart(now: Date = new Date()): Date {
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + 7);
  return weekStartFor(next);
}

function previousWeekStart(d: Date): Date {
  const prev = new Date(d);
  prev.setUTCDate(prev.getUTCDate() - 7);
  return weekStartFor(prev);
}

/**
 * Look up the current user's league membership for the given week.
 * Returns null when the user is not in any cohort (e.g. they earned
 * 0 XP last week and dropped off the rankings).
 */
export async function getCurrentLeague(
  userId: string,
  weekStart: Date = weekStartFor()
): Promise<LeagueMember | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.userId, userId),
        eq(leagueMembers.weekStart, isoDay(weekStart))
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Returns the top N members of the user's current league for the
 * leaderboard "current league" tab. Defaults to the user whose ID
 * is passed and the current week.
 */
export async function getLeagueCohort(args: {
  userId: string;
  weekStart?: Date;
  limit?: number;
}): Promise<{
  league: LeagueTier | null;
  rank: number | null;
  xp: number | null;
  cohort: Array<Pick<LeagueMember, "userId" | "rank" | "xp">>;
}> {
  const db = getDb();
  const weekStart = args.weekStart ?? weekStartFor();
  const limit = Math.min(args.limit ?? 20, 100);

  const [self] = await db
    .select()
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.userId, args.userId),
        eq(leagueMembers.weekStart, isoDay(weekStart))
      )
    )
    .limit(1);

  if (!self) {
    return { league: null, rank: null, xp: null, cohort: [] };
  }

  const cohort = await db
    .select({
      userId: leagueMembers.userId,
      rank: leagueMembers.rank,
      xp: leagueMembers.xp,
    })
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.weekStart, isoDay(weekStart)),
        eq(leagueMembers.league, self.league)
      )
    )
    .orderBy(leagueMembers.rank)
    .limit(limit);

  return {
    league: self.league,
    rank: self.rank,
    xp: self.xp,
    cohort,
  };
}

void desc; // silence unused-import warnings in tooling that strips them.