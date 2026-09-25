import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { users } from "./users";

/**
 * R9 — Offline PWA, Web Push, and exam proctoring data model.
 *
 * See docs/remaster-phase-9-pwa-proctoring.md §2 for the full contract.
 *
 * Tables in this file:
 *   - `web_push_subscriptions`  : one row per device VAPID subscription
 *                                 (the SW may register multiple times on
 *                                 different browsers / OSes).
 *   - `offline_outbox`          : offline-buffered writes; the SW queues
 *                                 here when offline and replays via
 *                                 `/api/offline/sync` on reconnect.
 *
 * The proctoring timeline lives in `src/db/schema/proctoring.ts`.
 *
 * Cost commitment: no new paid services. Web Push is VAPID-over-HTTP from
 * Workers free egress; offline_outbox lives on the existing Neon free tier
 * (FREE-TIER-REFERENCE.md §11).
 */

// ---------------------------------------------------------------------------
// web_push_subscriptions
// ---------------------------------------------------------------------------
//
// Categories is a free-form string[] of the opt-in categories the user
// accepted at subscription time. Fan-out uses ANY(category) matching via
// the GIN index. Categories are constrained at write-time by the service
// layer (see src/services/push/subscriptions.ts).
//
// Endpoint is the device-specific push URL (mozilla/apple/google). 404/410
// responses from push endpoints trigger removal from this table — see
// `services/push/send.ts`.

export const PUSH_CATEGORIES = [
  "live_reminder",
  "grade_posted",
  "qa_replied",
  "payment_receipt",
] as const;

export type PushCategory = (typeof PUSH_CATEGORIES)[number];

export const webPushSubscriptions = pgTable(
  "web_push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    locale: text("locale").notNull().default("en"),
    categories: text("categories")
      .array()
      .notNull()
      .default(sql`ARRAY['live_reminder','grade_posted','qa_replied']::text[]`),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [
    // Hot path: list a user's enabled subscriptions.
    index("web_push_subscriptions_user_idx").on(table.userId).where(
      sql`${table.enabled} = true`
    ),
    // Fan-out lookup: subscriptions matching a category. GIN index on the
    // array column lets us match ANY(category) without sequential scan.
    index("web_push_subscriptions_category_idx").using("gin", table.categories),
  ]
);

export type WebPushSubscription = typeof webPushSubscriptions.$inferSelect;
export type NewWebPushSubscription = typeof webPushSubscriptions.$inferInsert;

// ---------------------------------------------------------------------------
// offline_outbox
// ---------------------------------------------------------------------------
//
// Queued writes from the service worker when offline. Each row carries the
// stable `client_id` the device generated — the unique (user_id, client_id)
// constraint is what makes sync replays idempotent. The SW posts here when
// `navigator.onLine === false`; the `/api/offline/sync` endpoint drains
// `synced_at IS NULL` rows for the authenticated user.

export const OFFLINE_OUTBOX_KINDS = [
  "assignment.submit",
  "exam.answer.save",
] as const;

export type OfflineOutboxKind = (typeof OFFLINE_OUTBOX_KINDS)[number];

export const offlineOutbox = pgTable(
  "offline_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull(),
    clientId: text("client_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("offline_outbox_user_client_unique").on(
      table.userId,
      table.clientId
    ),
    // Hot path: drain the unsynced queue for a user.
    index("offline_outbox_unsynced_idx")
      .on(table.syncedAt)
      .where(sql`${table.syncedAt} IS NULL`),
    index("offline_outbox_user_unsynced_idx")
      .on(table.userId, table.createdAt)
      .where(sql`${table.syncedAt} IS NULL`),
  ]
);

export type OfflineOutbox = typeof offlineOutbox.$inferSelect;
export type NewOfflineOutbox = typeof offlineOutbox.$inferInsert;
