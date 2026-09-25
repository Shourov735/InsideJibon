import {
  bigserial,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./index";

/**
 * Audit log for high-trust actions (role changes, exam publish, payment
 * grants, enrollment grants, destructive operations).
 *
 * Writes are append-only. Reads are paginated and filtered by actor/action
 * for the admin console. The companion `request_dedupe` table guarantees
 * idempotency on webhook-style mutations; `audit_log` records the *fact*,
 * not the *delivery*.
 *
 * `metadata` is `jsonb` so each action can carry structured context
 * (e.g. `{ fromRole: "student", toRole: "teacher" }`). Never store
 * secrets or PII in metadata.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    subjectId: text("subject_id"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_log_actor_created_idx").on(table.actorId, table.createdAt),
    index("audit_log_action_created_idx").on(table.action, table.createdAt),
  ]
);

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
