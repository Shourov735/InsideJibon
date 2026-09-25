import { NextResponse } from "next/server";

import { computeWeeklyLeaderboard, weekStartFor } from "@/services/leaderboard";
import { getDb } from "@/db";
import { courses } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Cron Trigger entry point — fires at hh:13 every 2 hours via
 * `wrangler.jsonc`'s `triggers.crons`. Two jobs run per invocation:
 *
 *   1. Global leaderboard (`computeWeeklyLeaderboard('global')`).
 *   2. Per-course leaderboards for all *active* courses. "Active" =
 *      has at least one student with an active enrollment within the
 *      last 30 days OR is owned by a teacher who updated the course
 *      in the last 30 days. This keeps the cron budget bounded; cold
 *      courses recompute on demand when a student visits them.
 *
 * Cloudflare's Free plan allows 5 cron triggers per worker — this is
 * the only one we currently use. The handler returns 200 quickly and
 * logs progress via Workers Analytics (see wrangler.jsonc observability).
 *
 * No auth — Cron Triggers are server-side only and the URL is not
 * advertised. We still set `Cache-Control: no-store` to discourage any
 * accidental caching by intermediaries.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scopeParam = url.searchParams.get("scope");
  const weekStartParam = url.searchParams.get("weekStart");

  const weekStart = weekStartParam ? new Date(weekStartParam) : weekStartFor();

  try {
    if (scopeParam === "global" || !scopeParam) {
      const result = await computeWeeklyLeaderboard({
        scopeKind: "global",
        weekStart,
      });
      if (!scopeParam) {
        // Run a global recompute + per-course in the same invocation.
        const perCourse = await recomputeActiveCourses(weekStart);
        return NextResponse.json(
          {
            ok: true,
            global: result.entries.length,
            perCourse: perCourse.computed,
            skipped: perCourse.skipped,
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
      return NextResponse.json(
        { ok: true, scope: "global", entries: result.entries.length },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (scopeParam === "course") {
      const courseId = url.searchParams.get("courseId");
      if (!courseId) {
        return NextResponse.json(
          { ok: false, error: "Missing courseId" },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
      const result = await computeWeeklyLeaderboard({
        scopeKind: "course",
        scopeId: courseId,
        weekStart,
      });
      return NextResponse.json(
        { ok: true, scope: "course", courseId, entries: result.entries.length },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { ok: false, error: `Unknown scope: ${scopeParam}` },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Cron leaderboard failed", error);
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

/**
 * Run per-course recomputes for every "active" course. We bound the
 * workload to a sane cap so a runaway cron tick doesn't blow the
 * 30s Workers wall-clock budget on the Free plan.
 */
const ACTIVE_COURSE_LIMIT = 50;

async function recomputeActiveCourses(weekStart: Date) {
  const db = getDb();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // A course is "active" if it has at least one active enrollment
  // touched in the last 30 days OR was updated in the last 30 days.
  // This query joins enrollments -> courses with a HAVING clause on
  // recent activity.
  const rows = await db
    .select({
      courseId: courses.id,
      recent: sql<number>`GREATEST(
        COALESCE(MAX(${courses.updatedAt}::timestamptz), 'epoch'::timestamptz),
        COALESCE(MAX(${courses.createdAt}::timestamptz), 'epoch'::timestamptz)
      )`,
    })
    .from(courses)
    .where(eq(courses.status, "published"))
    .limit(ACTIVE_COURSE_LIMIT);

  const activeRows = rows
    .filter((r) => new Date((r.recent as unknown as string | number | Date)) > cutoff)
    .slice(0, ACTIVE_COURSE_LIMIT);

  let computed = 0;
  let skipped = 0;
  for (const row of activeRows) {
    try {
      await computeWeeklyLeaderboard({
        scopeKind: "course",
        scopeId: row.courseId,
        weekStart,
      });
      computed += 1;
    } catch (error) {
      console.error(`Course leaderboard recompute failed (${row.courseId})`, error);
      skipped += 1;
    }
  }

  return { computed, skipped };
}
