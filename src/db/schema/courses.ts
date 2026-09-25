import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { users } from "./users";

export const courseStatusEnum = pgEnum("course_status", [
  "draft",
  "published",
  "archived",
]);

export const courseCategoryEnum = pgEnum("course_category", [
  "physics",
  "chemistry",
  "biology",
  "mathematics",
  "english",
  "bangla",
  "general_science",
  "ict",
  "other",
]);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    thumbnailUrl: text("thumbnail_url"),
    category: courseCategoryEnum("category"),
    status: courseStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // R6: paid course flag and BDT price (free courses leave both null/false).
    requiresPayment: boolean("requires_payment").notNull().default(false),
    priceBdt: numeric("price_bdt", { precision: 10, scale: 2 }),
  },
  (table) => [
    uniqueIndex("courses_slug_unique").on(table.slug),
    index("courses_teacher_id_idx").on(table.teacherId),
    index("courses_status_idx").on(table.status),
    index("courses_teacher_status_idx").on(table.teacherId, table.status),
    index("courses_category_idx").on(table.category),
  ]
);

export const courseModules = pgTable(
  "course_modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("course_modules_course_id_idx").on(table.courseId),
    index("course_modules_course_position_idx").on(table.courseId, table.position),
  ]
);

export const VIDEO_PROVIDERS = ["youtube", "r2_hls", "external"] as const;
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];

export interface VideoRendition {
  resolution: "480p" | "720p" | "1080p" | string;
  width?: number;
  height?: number;
  bitrateKbps?: number;
  manifestPath?: string;
  codec?: string;
}

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => courseModules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    content: text("content"),
    videoUrl: text("video_url"),
    position: integer("position").notNull().default(1),
    isFree: boolean("is_free").notNull().default(false),

    // --- Remaster Phase R2: Video provider & asset references ---
    /** 'youtube' (default, $0) | 'r2_hls' (opt-in fallback) | 'external' (legacy) */
    videoProvider: text("video_provider").notNull().default("youtube"),
    /** Canonical 11-char YouTube ID (e.g. 'dQw4w9WgXcQ') */
    youtubeVideoId: text("youtube_video_id"),
    /** Auto-caption language code ('en' | 'bn' | null) for accessibility and R8 AI tutor */
    youtubeCaptionLang: text("youtube_caption_lang"),
    /** R2 manifest key when provider='r2_hls' (e.g. 'videos/<lessonId>/master.m3u8') */
    videoAssetId: text("video_asset_id"),
    /** Video duration in seconds */
    videoDurationS: integer("video_duration_s"),
    /** R2 storage key for custom thumbnail in PUBLIC_BUCKET */
    videoThumbnailKey: text("video_thumbnail_key"),
    /** HLS rendition metadata array (only populated for r2_hls) */
    videoRenditions: jsonb("video_renditions")
      .$type<VideoRendition[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("lessons_module_id_idx").on(table.moduleId),
    index("lessons_module_position_idx").on(table.moduleId, table.position),
    index("lessons_video_provider_idx").on(table.videoProvider),
  ]
);

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type CourseStatus = Course["status"];
export type CourseCategory = Course["category"];

export type CourseModule = typeof courseModules.$inferSelect;
export type NewCourseModule = typeof courseModules.$inferInsert;

export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
