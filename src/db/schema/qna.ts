import {
  bigserial,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";

import { users } from "./index";
import { lessonComments } from "./learning";

/**
 * R4 Doubt Q&A — service-facing alias for the `lesson_comments` table.
 *
 * The DB table is named `lesson_comments` for backward compatibility
 * with the legacy comment thread (Phase 8) and with existing index
 * names/views. Service code uses `qaThreads` to express intent.
 *
 * Column reference:
 *   - `kind` ('question'|'answer'|'comment'|'comment_legacy')
 *   - `parentId` (`parent_id`) — NULL on top-level questions
 *   - `status` ('open'|'resolved'|'closed')
 *   - `acceptedAnswerId` — points to a `kind='answer'` row
 *   - `upvotes`, `downvotes` — denormalized counters; the source of
 *      truth is `qa_votes`. See `vote()` for the compare-and-swap
 *      update that keeps counters honest without transactions.
 */
export const qaThreads = lessonComments;
export type QaThread = typeof qaThreads.$inferSelect;
export type NewQaThread = typeof qaThreads.$inferInsert;
export type QaKind = QaThread["kind"];
export type QaStatus = QaThread["status"];

/**
 * Per-user vote ledger. Composite PK guarantees one vote per (thread, user);
 * `value` is +/-1 (clearing a vote = deleting the row, not setting 0).
 *
 * Race safety note: drizzle-orm/neon-http has NO transactions. Vote
 * counts on `qa_threads` use an atomic compare-and-swap UPDATE in the
 * service layer (`vote()`) — see `src/services/qna/threads.ts`.
 */
export const qaVotes = pgTable(
  "qa_votes",
  {
    threadId: text("thread_id")
      .notNull()
      .references(() => lessonComments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: smallint("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.threadId, table.userId] }),
    index("qa_votes_user_idx").on(table.userId, table.createdAt),
  ]
);

export type QaVote = typeof qaVotes.$inferSelect;
export type NewQaVote = typeof qaVotes.$inferInsert;

/**
 * Materialized weekly leaderboard. Scope kinds:
 *   - 'global' : top users across the platform for the week
 *   - 'course' : top users in a specific course for the week
 *
 * `entries` is JSONB: [{ userId: string, xp: number, rank: number }, …]
 * truncated to top 100. Backed by `xp_events`.
 *
 * The unique index `(scope_kind, scope_id, week_start)` plus `ON CONFLICT
 * DO UPDATE` makes cron refreshes idempotent.
 */
export const leaderboardSnapshots = pgTable(
  "leaderboard_snapshots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    scopeKind: text("scope_kind").notNull(),
    scopeId: text("scope_id"),
    weekStart: date("week_start").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    entries: jsonb("entries").notNull().default(sql`'[]'::jsonb`),
  },
  (table) => [
    uniqueIndex("leaderboard_scope_week_unique").on(
      table.scopeKind,
      table.scopeId,
      table.weekStart
    ),
    index("leaderboard_scope_week_idx").on(
      table.scopeKind,
      table.scopeId,
      table.weekStart
    ),
  ]
);

export type LeaderboardSnapshot = typeof leaderboardSnapshots.$inferSelect;
export type NewLeaderboardSnapshot = typeof leaderboardSnapshots.$inferInsert;

/**
 * Raw XP ledger. R4 only emits for `qa.upvote` and `qa.accepted`; R5
 * retrofits lesson.complete / exam.pass / streak.day etc.
 *
 * Sources (string constants live in `src/services/xp/sources.ts`):
 *   - `qa.upvote`     : +5 per NEW upvote received on your thread
 *   - `qa.accepted`   : +25 to the author of the accepted answer
 *   - `lesson.complete` : reserved (R5)
 *   - `exam.pass`     : reserved (R5)
 *   - `streak.day`    : reserved (R5)
 */
export const xpEvents = pgTable(
  "xp_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    amount: integer("amount").notNull(),
    context: jsonb("context").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("xp_events_user_idx").on(table.userId, table.createdAt),
    index("xp_events_source_idx").on(table.source, table.createdAt),
    index("xp_events_user_source_created_idx").on(
      table.userId,
      table.source,
      table.createdAt
    ),
  ]
);

export type XpEvent = typeof xpEvents.$inferSelect;
export type NewXpEvent = typeof xpEvents.$inferInsert;