import {
  bigserial,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Cache invalidation audit log.
 * Tracks Cloudflare edge cache tag purges triggered across the application.
 *
 * `actor_id` is deliberately unconstrained (no FK to users.id) so that
 * system routines, queue workers, and cron triggers (e.g. 'system', 'cron')
 * can safely record purges without triggering foreign key constraint violations.
 */
export const cacheInvalidations = pgTable(
  "cache_invalidations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** Cache tag purged (e.g. 'course:physics-101', 'catalog:list', 'marketing:landing') */
    tag: text("tag").notNull(),
    /** Operational reason (e.g. 'course.publish', 'lesson.update', 'teacher.edit') */
    reason: text("reason"),
    /** Actor identifier: Clerk user ID, 'system', or 'cron' */
    actorId: text("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("cache_invalidations_tag_idx").on(table.tag, table.createdAt.desc()),
  ]
);

export type CacheInvalidation = typeof cacheInvalidations.$inferSelect;
export type NewCacheInvalidation = typeof cacheInvalidations.$inferInsert;
