import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * R5 — Generic user inventory.
 *
 * Stores per-user quantities of any item granted over time — streak
 * freezes, energy refills, future badges-of-mercy, etc. The composite
 * primary key `(user_id, item_key)` means a user can hold many
 * distinct item types simultaneously. `lastGrantAt` is the last time a
 * quantity was added for this item (used by the energy-refill cron to
 * decide whether to credit another tick).
 */
export const userInventory = pgTable(
  "user_inventory",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(),
    quantity: integer("quantity").notNull().default(0),
    lastGrantAt: timestamp("last_grant_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.itemKey] }),
  ],
);

export type UserInventoryRow = typeof userInventory.$inferSelect;
export type NewUserInventoryRow = typeof userInventory.$inferInsert;