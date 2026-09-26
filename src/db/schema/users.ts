import {
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Leaf `users` table — imported by every other schema file. Lives in its
 * own module (no re-exports) to break the historical schema/index
 * circular dependency that grew once `qna` aliased `lessonComments`
 * during R4.
 *
 * R7 — `role` now admits 'parent' in addition to student / teacher /
 * admin. Migration `0021_remaster_r7_parent.sql` converted the column
 * from `pgEnum` to TEXT + CHECK so we can ALTER values without
 * recreating the enum type. We retain the `roleEnum` constant for
 * code-gen consistency, but cast the runtime column through a TEXT
 * column so the wider domain is reachable.
 */

export const roleEnum = pgEnum("role", [
  "student",
  "teacher",
  "admin",
  "parent",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  imageUrl: text("image_url"),
  // Drizzle's roleEnum now lists 'parent'; the runtime CHECK constraint
  // defined in 0021 keeps the column in lockstep.
  role: roleEnum("role").notNull().default("student"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
/** Application role union — includes the parent role added in R7. */
export type Role = User["role"];
