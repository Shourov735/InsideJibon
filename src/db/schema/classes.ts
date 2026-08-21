import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { courses } from "./index";

export const sessionTypeEnum = pgEnum("session_type", ["live", "recorded"]);
export const sessionStatusEnum = pgEnum("session_status", ["upcoming", "completed", "cancelled"]);

export const classSessions = pgTable(
  "class_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    sessionType: sessionTypeEnum("session_type").notNull().default("live"),
    externalUrl: text("external_url"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    status: sessionStatusEnum("status").notNull().default("upcoming"),
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
  ]
);

export type ClassSession = typeof classSessions.$inferSelect;
export type NewClassSession = typeof classSessions.$inferInsert;
export type SessionType = ClassSession["sessionType"];
export type SessionStatus = ClassSession["status"];
