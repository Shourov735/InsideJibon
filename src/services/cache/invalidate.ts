import "server-only";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { cacheInvalidations } from "@/db/schema/cache";
import { purgeByTag, enqueuePurgeByTag } from "@/lib/cloudflare/cache";

export interface InvalidateOptions {
  reason?: string;
  actorId?: string | null;
}

export interface InvalidationResult {
  invalidatedTags: string[];
}

/**
 * Authoritative cache invalidation service:
 * 1. Sanitizes, validates, and deduplicates input tags.
 * 2. Purges matching indexed URLs in Cloudflare Cache API (caches.default).
 * 3. Broadcasts purge event over NOTIFICATIONS_QUEUE.
 * 4. Revalidates Next.js App Router cache for standard tags.
 * 5. Appends audit rows into `cache_invalidations` (with non-blocking error handling).
 */
export async function invalidateTags(
  tags: string[],
  options?: InvalidateOptions
): Promise<void> {
  if (!Array.isArray(tags) || tags.length === 0) {
    return;
  }

  // 1. Sanitize, trim, and deduplicate tags
  const cleanTags = Array.from(
    new Set(
      tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    )
  );

  if (cleanTags.length === 0) {
    return;
  }

  // 2. Purge local worker Cache API via KV index
  await Promise.all(
    cleanTags.map((tag) => purgeByTag(tag).catch(() => undefined))
  );

  // 3. Broadcast async purge event for distributed edge PoPs / replicas
  await Promise.all(
    cleanTags.map((tag) => enqueuePurgeByTag(tag).catch(() => undefined))
  );

  // 4. Next.js App Router internal path revalidation
  for (const tag of cleanTags) {
    try {
      if (tag === "marketing:landing") {
        revalidatePath("/");
      } else if (tag === "catalog:list") {
        revalidatePath("/courses");
      } else if (tag.startsWith("course:")) {
        const slug = tag.slice("course:".length);
        if (slug) {
          revalidatePath(`/courses/${slug}`);
        }
      }
    } catch {
      // Revalidation may fail if called outside a request context; safe to ignore.
    }
  }

  // 5. Append audit records to cache_invalidations
  try {
    const db = getDb();
    const rows = cleanTags.map((tag) => ({
      tag,
      reason: options?.reason ?? null,
      actorId: options?.actorId ?? null,
    }));

    // Batch insert in chunks of 25 for efficiency on high-volume invalidations
    const chunkSize = 25;
    for (let i = 0; i < rows.length; i += chunkSize) {
      await db.insert(cacheInvalidations).values(rows.slice(i, i + chunkSize));
    }
  } catch (auditError) {
    // Non-fatal: DB connectivity issues should never fail the user mutation
    console.error("[cache] Failed to write cache invalidation audit records:", auditError);
  }
}
