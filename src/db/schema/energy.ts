import {
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * R5 — Per-user energy / lives for quiz mode.
 *
 * Default 5 hearts; `maxEnergy` is the cap. `nextRefillAt` is the wall
 * clock time at which the user becomes eligible for another +1 tick;
 * the 5-minute cron grants +1 (capped at `maxEnergy`) when
 * `now() >= nextRefillAt` and pushes the timer forward by 30 minutes
 * (Duolingo convention).
 *
 * The R5 doc calls for an opt-in `costPerAttempt` knob on the exam
 * itself. We keep that column off-schema for now (R5 ships the energy
 * model; the per-exam knob lives on `exams` once teachers ask for it).
 */
export const userEnergy = pgTable("user_energy", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  energy: integer("energy").notNull().default(5),
  maxEnergy: integer("max_energy").notNull().default(5),
  nextRefillAt: timestamp("next_refill_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserEnergy = typeof userEnergy.$inferSelect;
export type NewUserEnergy = typeof userEnergy.$inferInsert;