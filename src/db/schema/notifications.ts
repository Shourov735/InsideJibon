import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./index";

export const notificationTypeEnum = pgEnum("notification_type", [
  "announcement",
  "exam_published",
  "assignment_published",
  "assignment_graded",
  "enrollment_request",
  "enrollment_decision",
  "class_session",
  "system",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_user_read_idx").on(table.userId, table.isRead),
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationType = Notification["type"];
