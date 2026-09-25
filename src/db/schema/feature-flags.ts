import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Feature flags. Mirrored at runtime into `FEATURE_FLAGS_KV` for hot
 * reads; the table is the source of truth for audit and admin updates.
 *
 * Reading paths (R0+) call `isFeatureEnabled(key)` from a service
 * wrapper that prefers the KV cache and falls back to the table.
 *
 * `payload` is `jsonb` so flags can carry structured configuration
 * (e.g. `{ percentage: 25, cohort: "beta" }`).
 */
export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  payload: jsonb("payload").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;

/**
 * Generic idempotency / dedupe table. Used by webhooks (Clerk, bKash),
 * CSV exports, AI tutor requests, and any handler that must guarantee
 * one-shot processing of an external event.
 *
 * `key` is opaque to the storage layer — callers choose an encoding
 * (e.g. `bkash:webhook:{trxId}` or `clerk:user:{userId}:created`).
 * `expires_at` lets us prune on read with a tiny `DELETE … WHERE
 * expires_at < now()` batch — Neon's free tier has no cron, so we
 * sweep lazily on insert.
 */
export const requestDedupe = pgTable(
  "request_dedupe",
  {
    key: text("key").primaryKey(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("request_dedupe_expires_idx").on(table.expiresAt)]
);

export type RequestDedupe = typeof requestDedupe.$inferSelect;
export type NewRequestDedupe = typeof requestDedupe.$inferInsert;
