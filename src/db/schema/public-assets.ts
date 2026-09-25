import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const PUBLIC_ASSET_OWNER_KINDS = [
  "system",
  "course",
  "lesson",
  "user",
  "teacher",
] as const;

export type PublicAssetOwnerKind = (typeof PUBLIC_ASSET_OWNER_KINDS)[number];

/**
 * Public assets audit and catalog table.
 *
 * Historical: rows were registered for every object placed in an
 * unauthenticated R2 bucket. The app is now link-only and no object storage
 * is bound, so no new rows are written — external media is referenced by the
 * plain HTTPS URL stored on the owning row (e.g. lessons.video_thumbnail_key).
 */
export const publicAssets = pgTable(
  "public_assets",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** Unique path/key within insidejibon-public (e.g. 'thumbnails/courses/abc.webp') */
    storageKey: text("storage_key").notNull().unique(),
    /** Media MIME type (e.g. 'image/webp', 'image/jpeg', 'video/mp4') */
    mimeType: text("mime_type").notNull(),
    /** Total byte length */
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    /** Owner domain kind: 'system' | 'course' | 'lesson' | 'user' | 'teacher' */
    ownerKind: text("owner_kind").notNull(),
    /** Target entity ID (course ID UUID, user ID text, or null for system) */
    ownerId: text("owner_id"),
    /** Categorization tags for filtering (e.g. ['thumbnail', 'course', 'physics']) */
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("public_assets_owner_idx").on(table.ownerKind, table.ownerId),
    index("public_assets_tags_idx").using("gin", table.tags),
  ]
);

export type PublicAsset = typeof publicAssets.$inferSelect;
export type NewPublicAsset = typeof publicAssets.$inferInsert;
