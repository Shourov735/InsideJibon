import {
  bigserial,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { courses } from "./courses";
import { lessons } from "./courses";
import { users } from "./users";

/**
 * R8 — AI tutor (Workers AI + Vectorize RAG over YouTube captions).
 *
 * See docs/remaster-phase-8-ai-tutor.md §2 for the data-model contract.
 *
 * Tables:
 *   - `ai_tutor_usage`     : per-student per-day question counter; the
 *                            authoritative rate-limit source of truth
 *                            (the KV bucket in `RATE_LIMIT_KV` is the
 *                            secondary hard ceiling).
 *   - `ai_tutor_messages`  : conversation history (single-turn for now,
 *                            but stored so future multi-turn is free).
 *   - `lesson_chunks`      : chunked text + Vectorize pointer for every
 *                            indexed lesson. Idempotent on `(lesson_id,
 *                            chunk_index)`; one row per chunk.
 *   - `ai_quiz_drafts`     : AI-generated quiz drafts awaiting teacher
 *                            review.
 */

// ---------------------------------------------------------------------------
// ai_tutor_usage — daily counter, also drives the R8 §3.5 rate limit.
// ---------------------------------------------------------------------------

export const aiTutorUsage = pgTable(
  "ai_tutor_usage",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    usageDay: date("usage_day").notNull(),
    questions: integer("questions").notNull().default(0),
  },
  (table) => [
    // Composite PK on (user_id, usage_day) — used as the atomic UPSERT
    // target for the R8 §3.5 rate-limit increment. The Neon HTTP driver
    // has no transactions; idempotency comes from a unique key that
    // `onConflictDoUpdate` can target. Drizzle exposes this via
    // `primaryKey({ columns: [...] })`.
    primaryKey({ columns: [table.userId, table.usageDay] }),
    index("ai_tutor_usage_user_idx").on(table.userId, table.usageDay),
  ]
);

export type AiTutorUsage = typeof aiTutorUsage.$inferSelect;
export type NewAiTutorUsage = typeof aiTutorUsage.$inferInsert;

// ---------------------------------------------------------------------------
// ai_tutor_messages — every tutor Q&A pair is logged for replay/audit.
// ---------------------------------------------------------------------------

export const aiTutorMessages = pgTable(
  "ai_tutor_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").references(() => lessons.id, {
      onDelete: "set null",
    }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    citations: jsonb("citations").notNull().default([]),
    lang: text("lang").notNull().default("en"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_tutor_messages_user_idx").on(table.userId, table.createdAt),
    index("ai_tutor_messages_course_idx").on(table.courseId, table.createdAt),
  ]
);

export type AiTutorMessage = typeof aiTutorMessages.$inferSelect;
export type NewAiTutorMessage = typeof aiTutorMessages.$inferInsert;

// ---------------------------------------------------------------------------
// lesson_chunks — chunked text + Vectorize pointer for every indexed lesson.
// Idempotent on (lesson_id, chunk_index). Source = youtube_caption by
// default; lessons without captions use lesson_text. The Vectorize id is
// `${lesson_id}:${chunk_index}` so reindex is a stable upsert.
// ---------------------------------------------------------------------------

export const lessonChunks = pgTable(
  "lesson_chunks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    tokenCount: integer("token_count").notNull(),
    vectorId: text("vector_id").notNull(),
    sourceKind: text("source_kind").notNull().default("youtube_caption"),
    sourceLang: text("source_lang").notNull().default("en"),
    startSec: integer("start_sec"),
    endSec: integer("end_sec"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Idempotency key: reindexing the same lesson upserts into the same
    // chunk_index slot. The unique index is what makes the R8 §3.4
    // pipeline safe to re-run.
    uniqueIndex("lesson_chunks_lesson_chunk_unique").on(
      table.lessonId,
      table.chunkIndex
    ),
    index("lesson_chunks_lesson_idx").on(table.lessonId),
  ]
);

export type LessonChunk = typeof lessonChunks.$inferSelect;
export type NewLessonChunk = typeof lessonChunks.$inferInsert;
export type LessonChunkSourceKind = "youtube_caption" | "lesson_text" | "material_text";
export type LessonChunkSourceLang = "en" | "bn";

// ---------------------------------------------------------------------------
// ai_quiz_drafts — AI-generated quiz drafts awaiting teacher review.
// ---------------------------------------------------------------------------

export const aiQuizDrafts = pgTable("ai_quiz_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").references(() => lessons.id, {
    onDelete: "set null",
  }),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

export type AiQuizDraft = typeof aiQuizDrafts.$inferSelect;
export type NewAiQuizDraft = typeof aiQuizDrafts.$inferInsert;
export type AiQuizDraftStatus = "draft" | "accepted" | "discarded";
