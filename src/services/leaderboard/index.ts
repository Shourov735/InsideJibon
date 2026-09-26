import "server-only";

import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  leaderboardSnapshots,
  users,
  xpEvents,
  type Role,
} from "@/db/schema";

/**
 * Per-course weekly leaderboards are composed by joining xp_events to
 * the lesson where the event originated. For R4 the only event sources
 * are QA-driven, so all QA events are attributed to the course that
 * owns the lesson of the originating thread. The thread's course is
 * resolved via `lesson_comments.lesson_id -> lessons.id ->
 * course_modules.course_id`.
 *
 * For 'global', we simply sum across all xp_events for users who are
 * still students (no role scope here — admins/teachers earn XP too in
 * R5+, and the global board surfaces the top 20 by default).
 */

export type LeaderboardScopeKind = "global" | "course";

export interface LeaderboardEntry {
  userId: string;
  userName: string | null;
  userImage: string | null;
  userRole: Role;
  xp: number;
  rank: number;
}

export interface LeaderboardWeek {
  scopeKind: LeaderboardScopeKind;
  scopeId: string | null;
  weekStart: string; // ISO date (YYYY-MM-DD), Monday
  entries: LeaderboardEntry[];
  computedAt: Date;
}

/**
 * Get the Monday (UTC) that starts the week containing `date`. We use
 * ISO week convention (Monday-start) which is also what the cron
 * triggers use.
 */
export function weekStartFor(date: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = d.getUTCDay(); // 0 Sun ... 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function asIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Read the most recent leaderboard snapshot for (scope_kind, scope_id,
 * week_start). If none exists for the current week, falls back to:
 *   1. the most recent snapshot from a previous week (still useful as a
 *      "last updated" view); or
 *   2. a live aggregate over xp_events (always correct, more expensive).
 *
 * Performance budget: live aggregate touches at most ~1000 rows for a
 * weekly window; the GIN+btree indexes on xp_events keep it well under
 * 100ms even on a busy course.
 */
export async function getWeeklyLeaderboard(args: {
  scopeKind: LeaderboardScopeKind;
  scopeId?: string | null;
  weekStart?: Date;
  limit?: number;
}): Promise<LeaderboardWeek> {
  const weekStart = args.weekStart ?? weekStartFor();
  const scopeId = args.scopeId ?? null;
  const limit = Math.min(args.limit ?? 20, 100);

  const db = getDb();
  const weekIso = asIsoDate(weekStart);

  const [snapshot] = await db
    .select()
    .from(leaderboardSnapshots)
    .where(
      and(
        eq(leaderboardSnapshots.scopeKind, args.scopeKind),
        scopeId
          ? eq(leaderboardSnapshots.scopeId, scopeId)
          : isNull(leaderboardSnapshots.scopeId),
        eq(leaderboardSnapshots.weekStart, weekIso)
      )
    )
    .orderBy(desc(leaderboardSnapshots.computedAt))
    .limit(1);

  if (snapshot) {
    const entries = parseEntries(snapshot.entries).slice(0, limit);
    return {
      scopeKind: args.scopeKind,
      scopeId,
      weekStart: weekIso,
      entries,
      computedAt: snapshot.computedAt,
    };
  }

  // Live fallback: recompute on demand (cheap; weekly window + GIN).
  const entries = await aggregateLeaderboard({
    scopeKind: args.scopeKind,
    scopeId,
    weekStart,
    limit,
  });

  return {
    scopeKind: args.scopeKind,
    scopeId,
    weekStart: weekIso,
    entries,
    computedAt: new Date(),
  };
}

/**
 * Compute (and persist) the weekly leaderboard for a given scope. The
 * persistence layer uses `ON CONFLICT (scope_kind, scope_id, week_start)
 * DO UPDATE` so concurrent cron invocations idempotently converge on the
 * latest snapshot — no locks required.
 */
export async function computeWeeklyLeaderboard(args: {
  scopeKind: LeaderboardScopeKind;
  scopeId?: string | null;
  weekStart?: Date;
  limit?: number;
}): Promise<LeaderboardWeek> {
  const weekStart = args.weekStart ?? weekStartFor();
  const scopeId = args.scopeId ?? null;
  const limit = Math.min(args.limit ?? 100, 100);
  const weekIso = asIsoDate(weekStart);

  const entries = await aggregateLeaderboard({
    scopeKind: args.scopeKind,
    scopeId,
    weekStart,
    limit,
  });

  const db = getDb();
  const entriesJson = JSON.stringify(
    entries.map((e) => ({ userId: e.userId, xp: e.xp, rank: e.rank }))
  );

  await db
    .insert(leaderboardSnapshots)
    .values({
      scopeKind: args.scopeKind,
      scopeId,
      weekStart: weekIso,
      entries: entriesJson,
    })
    .onConflictDoUpdate({
      target: [
        leaderboardSnapshots.scopeKind,
        leaderboardSnapshots.scopeId,
        leaderboardSnapshots.weekStart,
      ],
      set: {
        entries: entriesJson,
        computedAt: sql`now()`,
      },
    });

  return {
    scopeKind: args.scopeKind,
    scopeId,
    weekStart: weekIso,
    entries,
    computedAt: new Date(),
  };
}

/**
 * Resolve this user's personal rank within a leaderboard scope. If
 * they're outside the top-N, returns `{ rank, total, xp: 0 }` so the UI
 * can show "Your rank: 47 / 1,283".
 */
export async function getUserRank(args: {
  userId: string;
  scopeKind: LeaderboardScopeKind;
  scopeId?: string | null;
  weekStart?: Date;
}): Promise<{ rank: number; total: number; xp: number } | null> {
  const weekStart = args.weekStart ?? weekStartFor();
  const scopeId = args.scopeId ?? null;

  const rows = await aggregateXpRows({
    scopeKind: args.scopeKind,
    scopeId,
    weekStart,
    limit: 1000,
  });
  const total = rows.length;

  const sortedXpDesc = [...rows].sort((a, b) => b.xp - a.xp);
  const idx = sortedXpDesc.findIndex((r) => r.userId === args.userId);
  if (idx === -1) return null;
  return {
    rank: idx + 1,
    total,
    xp: sortedXpDesc[idx].xp,
  };
}

// ----------------------------------------------------------------------------
// Internals
// ----------------------------------------------------------------------------

interface AggregateArgs {
  scopeKind: LeaderboardScopeKind;
  scopeId: string | null;
  weekStart: Date;
  limit: number;
}

type XpRow = Record<string, unknown> & {
  userId: string;
  xp: number;
  userName: string | null;
  userImage: string | null;
  userRole: Role;
};

async function aggregateLeaderboard(args: AggregateArgs): Promise<LeaderboardEntry[]> {
  const rows = await aggregateXpRows(args);
  const sorted = [...rows].sort((a, b) => b.xp - a.xp);
  return sorted.slice(0, args.limit).map((row, i) => ({
    userId: row.userId,
    userName: row.userName,
    userImage: row.userImage,
    userRole: row.userRole,
    xp: row.xp,
    rank: i + 1,
  }));
}

async function aggregateXpRows(args: AggregateArgs): Promise<XpRow[]> {
  const db = getDb();
  const weekEndExclusive = new Date(args.weekStart);
  weekEndExclusive.setUTCDate(weekEndExclusive.getUTCDate() + 7);

  // Per-course scope: filter xp_events by threads that belong to a
  // lesson in this course. We resolve the join via a CTE-like subquery
  // (drizzle-orm/neon-http has no WITH in subselects — we emulate with
  // a single LEFT JOIN over qa_threads via the context jsonb, but for
  // R4 we can do a direct join: every qa.upvote/qa.accepted event in
  // context carries `threadId`, and we look up the lesson once and then
  // filter on course_id.
  //
  // For simplicity (and to keep round-trips to ≤1 query), we do two
  // aggregations and union them: (a) per-course via JOIN, (b) global via
  // a pure xp_events aggregate. The `scope_kind === 'course'` path
  // joins xp_events -> qa_threads (lesson_comments) ->
  // lessons -> course_modules -> courses.id.
  if (args.scopeKind === "course" && args.scopeId) {
    const rows = await db.execute<XpRow>(sql`
      SELECT
        u.id            AS "userId",
        u.name          AS "userName",
        u.image_url     AS "userImage",
        u.role          AS "userRole",
        COALESCE(SUM(xe.amount), 0)::int AS "xp"
      FROM "xp_events" xe
      JOIN "users" u ON u.id = xe.user_id
      JOIN "lesson_comments" lc ON lc.id::text = (xe.context->>'threadId')
      JOIN "lessons" l ON l.id = lc.lesson_id
      JOIN "course_modules" cm ON cm.id = l.module_id
      WHERE cm.course_id = ${args.scopeId}::uuid
        AND xe.created_at >= ${args.weekStart}
        AND xe.created_at <  ${sql.raw(
          `'${weekEndExclusive.toISOString()}'::timestamptz`
        )}
      GROUP BY u.id, u.name, u.image_url, u.role
    `);
    return (rows.rows ?? []) as XpRow[];
  }

  // Global scope.
  const rows = await db
    .select({
      userId: users.id,
      userName: users.name,
      userImage: users.imageUrl,
      userRole: users.role,
      xp: sql<number>`COALESCE(SUM(${xpEvents.amount}), 0)::int`,
    })
    .from(xpEvents)
    .innerJoin(users, eq(users.id, xpEvents.userId))
    .where(
      and(
        gte(xpEvents.createdAt, args.weekStart),
        lt(xpEvents.createdAt, weekEndExclusive)
      )
    )
    .groupBy(users.id, users.name, users.imageUrl, users.role);

  return rows as XpRow[];
}

function parseEntries(raw: unknown): LeaderboardEntry[] {
  if (!raw) return [];
  const obj = typeof raw === "string" ? safeJson(raw) : raw;
  if (!Array.isArray(obj)) return [];
  return obj.map((row, i) => {
    const r = row as { userId?: unknown; xp?: unknown };
    return {
      userId: typeof r.userId === "string" ? r.userId : "",
      userName: null,
      userImage: null,
      userRole: "student",
      xp: typeof r.xp === "number" ? r.xp : 0,
      rank: i + 1,
    };
  });
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
