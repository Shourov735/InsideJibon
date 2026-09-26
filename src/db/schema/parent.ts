import {
  check,
  index,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { users } from "./users";

/**
 * R7 — Parent Panel & Linked Accounts.
 *
 * Two tables that ship with the R7 remaster
 * (docs/remaster-phase-7-parent-panel.md §2):
 *
 *   parent_student_links — a many-to-many parent ↔ student relationship
 *                          guarded by an invitation-token handshake.
 *                          Only `status='active'` rows grant the parent
 *                          read-only access to the child's progress;
 *                          `pending` rows await student approval;
 *                          `revoked` rows are tombstoned.
 *
 *   parent_digest_prefs  — per-(parent, student) cadence + send hour.
 *                          Created lazily when the student approves a
 *                          link; defaults to 'daily' at 06:00 UTC.
 *                          Cadence 'off' silences digest email while
 *                          keeping the link active.
 *
 * Authorization invariants (enforced in `src/services/parent/access-control.ts`):
 *   1. Every parent-side read must call `assertCanReadStudent()` first.
 *   2. Parents never have a server-side write path against student data.
 *   3. The invitation token is single-use and removed after a successful
 *      `acceptLink()` call.
 */

export const parentStudentLinks = pgTable(
  "parent_student_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parentId: text("parent_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    inviteToken: text("invite_token"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("parent_student_links_parent_student_unique").on(
      table.parentId,
      table.studentId
    ),
    index("parent_student_links_parent_status_idx").on(
      table.parentId,
      table.status
    ),
    index("parent_student_links_student_status_idx").on(
      table.studentId,
      table.status
    ),
    index("parent_student_links_token_idx")
      .on(table.inviteToken)
      .where(sql`${table.inviteToken} IS NOT NULL`),
    check(
      "parent_student_links_status_check",
      sql`${table.status} IN ('pending', 'active', 'revoked')`
    ),
  ]
);

export type ParentStudentLink = typeof parentStudentLinks.$inferSelect;
export type NewParentStudentLink = typeof parentStudentLinks.$inferInsert;

export type ParentLinkStatus = "pending" | "active" | "revoked";

export const parentDigestPrefs = pgTable(
  "parent_digest_prefs",
  {
    parentId: text("parent_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cadence: text("cadence").notNull().default("daily"),
    sendHourUtc: smallint("send_hour_utc").notNull().default(6),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.parentId, table.studentId] }),
    index("parent_digest_prefs_cadence_idx").on(table.cadence),
    check(
      "parent_digest_prefs_cadence_check",
      sql`${table.cadence} IN ('daily', 'weekly', 'off')`
    ),
    check(
      "parent_digest_prefs_send_hour_check",
      sql`${table.sendHourUtc} BETWEEN 0 AND 23`
    ),
  ]
);

export type ParentDigestPref = typeof parentDigestPrefs.$inferSelect;
export type NewParentDigestPref = typeof parentDigestPrefs.$inferInsert;

export type DigestCadence = "daily" | "weekly" | "off";
