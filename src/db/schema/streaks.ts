import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * R5 — Per-user daily streak state.
 *
 * One row per user. `currentDays` is the active streak; `longestDays` is
 * the all-time best (never decreases). `lastActiveDay` is the UTC date
 * the streak was last extended — comparisons in `recordActivity()`
 * happen against today's UTC date. `freezesAvailable` is the weekly
 * allowance (refilled by the Monday cron), consumed one at a time when
 * a user skips a single day. `freezesUsedAt` records the most recent
 * consumption so the next grant can be detected.
 *
 * Concurrency note: `neon-http` has no transactions. `recordActivity`
 * uses an atomic conditional UPDATE keyed on `lastActiveDay` so two
 * concurrent calls on the same day do not double-count.
 */
export const dailyStreaks = pgTable("daily_streaks", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  currentDays: integer("current_days").notNull().default(0),
  longestDays: integer("longest_days").notNull().default(0),
  lastActiveDay: date("last_active_day"),
  freezesAvailable: integer("freezes_available").notNull().default(2),
  freezesUsedAt: timestamp("freezes_used_at", { withTimezone: true }),
  brokenAt: timestamp("broken_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type DailyStreak = typeof dailyStreaks.$inferSelect;
export type NewDailyStreak = typeof dailyStreaks.$inferInsert;