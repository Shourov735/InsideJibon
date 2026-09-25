import {
  bigserial,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { courses } from "./index";
import { users } from "./users";

export const sessionTypeEnum = pgEnum("session_type", ["live", "recorded"]);
export const sessionStatusEnum = pgEnum("session_status", [
  "upcoming",
  "completed",
  "cancelled",
]);
/**
 * R3 — replay status for the recorded VOD. `none` (default) before the
 * teacher pastes/publishes the YouTube replay id; `available` once the
 * replay iframe should be shown on the post-class page.
 */
export const replayStatusEnum = pgEnum("replay_status", ["none", "available"]);

export const classSessions = pgTable(
  "class_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    sessionType: sessionTypeEnum("session_type").notNull().default("live"),
    externalUrl: text("external_url"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    status: sessionStatusEnum("status").notNull().default("upcoming"),
    // --- R3 remaster additions ---
    /** DO instance id — equals the classSessionId (uuid string). */
    roomDurableObjectId: text("room_durable_object_id"),
    /** Set when the teacher starts YouTube Live (Unlisted). */
    youtubeLiveVideoId: text("youtube_live_video_id"),
    /** Same id post-stream (YouTube auto-VOD); teacher may also paste a different unlisted VOD id. */
    youtubeReplayVideoId: text("youtube_replay_video_id"),
    /** 'none' until teacher marks replay ready; 'available' once it is. */
    replayStatus: replayStatusEnum("replay_status").notNull().default("none"),
    /** Hard cap on students allowed in the live room. Default 200. */
    maxParticipants: integer("max_participants").notNull().default(200),
    /** When the pre-join lobby opens (typically scheduledAt - 15 minutes). */
    lobbyOpensAt: timestamp("lobby_opens_at", { withTimezone: true }),
    /** Set when teacher ends the class (server-side flush trigger). */
    endedAt: timestamp("ended_at", { withTimezone: true }),
    /** R3 — one-shot gate for the 15-min-before reminder. */
    classReminderSentAt: timestamp("class_reminder_sent_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("class_sessions_course_id_idx").on(table.courseId),
    index("class_sessions_scheduled_at_idx").on(table.scheduledAt),
    index("class_sessions_course_status_idx").on(table.courseId, table.status),
    // R3 — supports the "starting soon / live now" dashboard query.
    index("class_sessions_scheduled_window_idx").on(
      table.scheduledAt,
      table.status,
    ),
  ]
);

/**
 * R3 — per-session attendance rollup, one row per (session, student).
 * Idempotent via the UNIQUE constraint; the DO flushes attendance on
 * class end, which means rows can come in chunks. Updates accumulate
 * totalSeconds — we never delete; left_at advances as students leave.
 */
export const classAttendance = pgTable(
  "class_attendance",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull(),
    leftAt: timestamp("left_at", { withTimezone: true }),
    totalSeconds: integer("total_seconds").notNull().default(0),
    /** 'websocket' (R3 default) | 'hls' (future self-hosted path). */
    source: text("source").notNull().default("websocket"),
  },
  (table) => [
    uniqueIndex("class_attendance_session_student_unique").on(
      table.sessionId,
      table.studentId,
    ),
    index("class_attendance_student_idx").on(
      table.studentId,
      table.joinedAt,
    ),
    index("class_attendance_session_idx").on(
      table.sessionId,
      table.totalSeconds,
    ),
  ],
);

/**
 * R3 — reactions are short-lived on screen but persisted for analytics
 * and the replay timeline overlay. We do NOT make this unique on
 * (session, user) — clap/heart/eyes/fire/laugh/raise_hand are rate-
 * limited in the DO (per-second caps); duplicate inserts are allowed.
 */
export const REACTION_TYPES = [
  "clap",
  "heart",
  "eyes",
  "fire",
  "laugh",
  "raise_hand",
] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const classReactions = pgTable(
  "class_reactions",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reaction: text("reaction").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("class_reactions_session_idx").on(
      table.sessionId,
      table.createdAt,
    ),
    check(
      "class_reactions_reaction_check",
      sql`${table.reaction} IN ('clap','heart','eyes','fire','laugh','raise_hand')`,
    ),
  ],
);

/**
 * R3 — persisted chat for transcript / replay overlay. The DO holds the
 * rolling 200-msg buffer in-memory; on class end it flushes the full
 * transcript here. Soft-delete keeps moderation reversible.
 */
export const classChat = pgTable(
  "class_chat",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("class_chat_session_idx").on(table.sessionId, table.createdAt),
    index("class_chat_user_idx").on(table.userId),
  ],
);

export type ClassSession = typeof classSessions.$inferSelect;
export type NewClassSession = typeof classSessions.$inferInsert;
export type SessionType = ClassSession["sessionType"];
export type SessionStatus = ClassSession["status"];
export type ReplayStatus = ClassSession["replayStatus"];

export type ClassAttendanceRow = typeof classAttendance.$inferSelect;
export type NewClassAttendance = typeof classAttendance.$inferInsert;

export type ClassReactionRow = typeof classReactions.$inferSelect;
export type NewClassReaction = typeof classReactions.$inferInsert;

export type ClassChatRow = typeof classChat.$inferSelect;
export type NewClassChat = typeof classChat.$inferInsert;
