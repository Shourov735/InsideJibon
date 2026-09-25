import {
  bigserial,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { examAttempts } from "./exams";
import { users } from "./users";

/**
 * R9 — Exam proctoring timeline.
 *
 * See docs/remaster-phase-9-pwa-proctoring.md §3.5.
 *
 * `exam_proctor_events` is an append-only per-attempt log. Every proctoring
 * signal — `fullscreen.exit`, `tab.blur`, `webcam.start`, `webcam.chunk`,
 * `paste`, `rightclick` — becomes one row. The teacher review UI replays
 * this log to render the rail at the grading screen.
 *
 * Quick writes are essential: the exam-taker sends one event per signal
 * and expects sub-100ms response so the timeline can be appended in
 * batches on the client. Per-attempt counters (`exam_attempts.proctor_flag_count`,
 * `exam_attempts.proctor_flagged`) are maintained via atomic UPDATE.
 *
 * The proctoring settings columns on the `exams` table and the denormalized
 * flag/state columns on `exam_attempts` are declared inline on those tables
 * (`src/db/schema/exams.ts`).
 */

// ---------------------------------------------------------------------------
// exam_proctor_events — append-only timeline
// ---------------------------------------------------------------------------
//
// `kind` is free-text for forward compat; the canonical values are:
//   - fullscreen.exit, fullscreen.enter
//   - tab.blur, tab.focus
//   - webcam.start, webcam.stop, webcam.chunk
//   - paste
//   - rightclick
//
// `payload` carries event-specific data (chunk index, attempt time delta,
// etc.) — empty {} when nothing is needed.

export const EXAM_PROCTOR_KINDS = [
  "fullscreen.enter",
  "fullscreen.exit",
  "tab.blur",
  "tab.focus",
  "webcam.start",
  "webcam.stop",
  "webcam.chunk",
  "paste",
  "rightclick",
] as const;

export type ExamProctorKind = (typeof EXAM_PROCTOR_KINDS)[number];

export const examProctorEvents = pgTable(
  "exam_proctor_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => examAttempts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Hot path: render the teacher review timeline for one attempt.
    index("exam_proctor_events_attempt_idx").on(
      table.attemptId,
      table.createdAt
    ),
    // User activity stream (e.g. flag investigations).
    index("exam_proctor_events_user_idx").on(table.userId, table.createdAt),
  ]
);

export type ExamProctorEvent = typeof examProctorEvents.$inferSelect;
export type NewExamProctorEvent = typeof examProctorEvents.$inferInsert;
