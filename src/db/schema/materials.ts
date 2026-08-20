import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { lessons } from "./index";

/**
 * Downloadable course materials attached to a lesson (PDF notes, slides,
 * worksheets, images, ZIP archives, ...).
 *
 * Ownership is NOT duplicated on this row: it is derived through
 * material → lesson → module → course → course.teacherId, so cross-teacher
 * tampering is impossible as long as every mutation resolves that chain in
 * the database (services/materials does exactly that).
 *
 * The storage_key names the object inside the R2 bucket and is treated as
 * an internal secret — it is never returned to clients. Deleting a lesson
 * (or course) cascades the metadata rows away; the corresponding R2
 * objects are cleaned up best-effort by the services layer.
 */
export const materials = pgTable(
  "materials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    originalFilename: text("original_filename").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("materials_storage_key_unique").on(table.storageKey),
    index("materials_lesson_id_idx").on(table.lessonId),
  ]
);

export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;