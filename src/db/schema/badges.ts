import {
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const badgeTierEnum = pgEnum("badge_tier", [
  "bronze",
  "silver",
  "gold",
]);

/**
 * R5 — Declarative badge catalog.
 *
 * Seeded by migration `0015_remaster_r5_gamification`. The badge id is a
 * stable slug used by the service-layer metric table
 * (`BADGE_METRICS` in `src/services/gamification/badges.ts`). Title and
 * description live as i18n keys so the same row serves both English and
 * Bangla.
 *
 * `icon` is a short token (`flame`, `sprout`, `star`, …) that the UI
 * maps to an inline SVG / heroicon. `pointsReward` is the XP bonus
 * awarded via `badge.unlocked` when the badge is first unlocked.
 */
export const badges = pgTable("badges", {
  id: text("id").primaryKey(),
  titleKey: text("title_key").notNull(),
  descriptionKey: text("description_key").notNull(),
  icon: text("icon").notNull(),
  tier: badgeTierEnum("tier").notNull().default("bronze"),
  pointsReward: integer("points_reward").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Badge = typeof badges.$inferSelect;
export type NewBadge = typeof badges.$inferInsert;
export type BadgeTier = Badge["tier"];

/**
 * R5 — Per-user badge progress.
 *
 * Seeded lazily by `ensureBadgeProgressRows(userId)` so the table stays
 * small (zero rows until a user is observed). `unlockedAt IS NULL`
 * means locked-but-tracking; `unlockedAt` set means earned.
 *
 * The (user_id, badge_id) composite primary key guarantees one row per
 * pair. An index on `unlocked_at` powers "recently unlocked" queries on
 * the badge shelf and dashboard.
 */
export const badgeProgress = pgTable(
  "badge_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    progress: integer("progress").notNull().default(0),
    target: integer("target").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.badgeId] }),
    index("badge_progress_user_idx").on(table.userId),
    index("badge_progress_unlocked_idx").on(table.unlockedAt),
  ],
);

export type BadgeProgress = typeof badgeProgress.$inferSelect;
export type NewBadgeProgress = typeof badgeProgress.$inferInsert;