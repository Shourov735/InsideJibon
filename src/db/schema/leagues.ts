import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const leagueTierEnum = pgEnum("league_tier", [
  "bronze",
  "silver",
  "gold",
  "diamond",
]);

/**
 * R5 — League membership.
 *
 * One row per (weekStart, user). `weekStart` is the ISO date (Monday
 * UTC) of the week the membership applies to. The Sunday cron
 * (`/api/cron/weekly-leagues`) overwrites the upcoming week's rows by
 * computing the previous week's XP totals and partitioning users into
 * Bronze/Silver/Gold/Diamond cohorts. `promoted` / `relegated` are set
 * by comparing this week's league to last week's, for the upcoming
 * week's animation hook on `/leaderboard`.
 *
 * Note: the weekly cron targets *last week's* XP totals to populate
 * *this week's* league_members rows. The first week after launch will
 * have empty rank data — that's expected.
 */
export const leagueMembers = pgTable(
  "league_members",
  {
    weekStart: date("week_start").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    league: leagueTierEnum("league").notNull().default("bronze"),
    rank: integer("rank"),
    xp: integer("xp").notNull().default(0),
    promoted: boolean("promoted").notNull().default(false),
    relegated: boolean("relegated").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.weekStart, table.userId] }),
    index("league_members_week_league_rank_idx").on(
      table.weekStart,
      table.league,
      table.rank,
    ),
    index("league_members_user_idx").on(table.userId),
  ],
);

export type LeagueMember = typeof leagueMembers.$inferSelect;
export type NewLeagueMember = typeof leagueMembers.$inferInsert;
export type LeagueTier = LeagueMember["league"];