import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * R5 — XP source registry.
 *
 * One row per earnable event. The service layer (`emitXp`) looks up the
 * `defaultAmount` from this table on each emission, so the gamification
 * tuning happens in the database — not by redeploying code. The
 * canonical list of *known* source names still lives in
 * `src/services/xp/sources.ts` (compile-time type safety), but the
 * runtime amounts are data-driven.
 *
 * Seeded by migration `0015_remaster_r5_gamification`.
 */
export const xpSources = pgTable("xp_sources", {
  sourceKey: text("source_key").primaryKey(),
  defaultAmount: integer("default_amount").notNull(),
  descriptionKey: text("description_key").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type XpSourceRow = typeof xpSources.$inferSelect;
export type NewXpSourceRow = typeof xpSources.$inferInsert;