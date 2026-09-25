import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { PUSH_CATEGORIES, type PushCategory, webPushSubscriptions } from "@/db/schema";

/**
 * R9 — Web Push subscription registry.
 *
 * The browser registers a VAPID subscription per device; we persist it as
 * one row keyed on `endpoint` (unique). Multiple rows per user are normal
 * (laptop, phone, tablet). When the SW gets back 404/410 from a push
 * gateway, the row is removed in `send.ts` (see `pruneDeadEndpoint`).
 *
 * Categories are validated against `PUSH_CATEGORIES` so that fan-out can
 * trust the array as a closed set. The service layer is the trust boundary
 * — clients only suggest, the server clamps.
 */

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string | null;
  locale?: string;
};

function clampCategories(input: readonly string[] | undefined): PushCategory[] {
  const allowed = new Set<string>(PUSH_CATEGORIES);
  const values = input ?? [];
  const dedup: PushCategory[] = [];
  for (const v of values) {
    if (allowed.has(v) && !dedup.includes(v as PushCategory)) {
      dedup.push(v as PushCategory);
    }
  }
  return dedup.length > 0 ? dedup : ["live_reminder", "grade_posted", "qa_replied"];
}

/**
 * Upsert a subscription by `endpoint`. If the endpoint exists for a
 * different user (e.g. a student logs in on a sibling's device), take
 * ownership. Updates `categories`, `locale`, `user_agent`, and bumps
 * `last_used_at`.
 */
export async function registerSubscription(args: {
  userId: string;
  subscription: PushSubscriptionInput;
  categories: readonly string[];
}): Promise<{ id: string }> {
  const db = getDb();
  const categories = clampCategories(args.categories);

  const [row] = await db
    .insert(webPushSubscriptions)
    .values({
      userId: args.userId,
      endpoint: args.subscription.endpoint,
      p256dh: args.subscription.keys.p256dh,
      auth: args.subscription.keys.auth,
      userAgent: args.subscription.userAgent ?? null,
      locale: args.subscription.locale ?? "en",
      categories,
      enabled: true,
    })
    .onConflictDoUpdate({
      target: webPushSubscriptions.endpoint,
      set: {
        userId: args.userId,
        p256dh: args.subscription.keys.p256dh,
        auth: args.subscription.keys.auth,
        userAgent: args.subscription.userAgent ?? null,
        locale: args.subscription.locale ?? "en",
        categories,
        enabled: true,
        lastUsedAt: new Date(),
      },
    })
    .returning({ id: webPushSubscriptions.id });

  if (!row) throw new Error("Failed to register push subscription.");
  return row;
}

/**
 * Disable (soft delete) the subscription for the endpoint. We keep the
 * row so future re-subscribes from the same device are idempotent.
 * Hard deletion happens in `pruneDeadEndpoint` on push 404/410.
 */
export async function unregisterSubscription(args: {
  userId: string;
  endpoint: string;
}): Promise<void> {
  const db = getDb();
  await db
    .update(webPushSubscriptions)
    .set({ enabled: false })
    .where(
      and(
        eq(webPushSubscriptions.userId, args.userId),
        eq(webPushSubscriptions.endpoint, args.endpoint)
      )
    );
}

/**
 * Hard-remove an endpoint after the push gateway responded 404/410. The
 * caller passes the raw endpoint string; no ownership check is done — by
 * construction only the original subscription owner would see that code
 * (404/410 is opaque).
 */
export async function pruneDeadEndpoint(endpoint: string): Promise<void> {
  const db = getDb();
  await db
    .delete(webPushSubscriptions)
    .where(eq(webPushSubscriptions.endpoint, endpoint));
}

/**
 * Subscribers matching a category. Optionally further scoped by `userId`
 * (single-user direct push) and `courseId` (enrollment-scoped fan-out —
 * the caller joins the enrollment list and passes a list of user ids).
 */
export async function listSubscribers(args: {
  category: PushCategory;
  userIds?: readonly string[];
}): Promise<Array<{
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}>> {
  const db = getDb();

  // categories is a text[]. Match ANY(category) = our category.
  // We use the GIN index indirectly via `sql\`${categories} @> ARRAY[...]\``.
  // The ANY() form would also work but the array-contains form composes
  // better when we later add per-subscription category toggles.
  const filters = [
    eq(webPushSubscriptions.enabled, true),
    sql`${webPushSubscriptions.categories} @> ARRAY[${args.category}]::text[]`,
  ];
  if (args.userIds && args.userIds.length > 0) {
    filters.push(inArray(webPushSubscriptions.userId, args.userIds as string[]));
  }

  return db
    .select({
      id: webPushSubscriptions.id,
      userId: webPushSubscriptions.userId,
      endpoint: webPushSubscriptions.endpoint,
      p256dh: webPushSubscriptions.p256dh,
      auth: webPushSubscriptions.auth,
    })
    .from(webPushSubscriptions)
    .where(and(...filters));
}

export async function listUserSubscriptions(userId: string): Promise<
  Array<{
    id: string;
    endpoint: string;
    categories: string[];
    locale: string;
    createdAt: Date;
  }>
> {
  const db = getDb();
  return db
    .select({
      id: webPushSubscriptions.id,
      endpoint: webPushSubscriptions.endpoint,
      categories: webPushSubscriptions.categories,
      locale: webPushSubscriptions.locale,
      createdAt: webPushSubscriptions.createdAt,
    })
    .from(webPushSubscriptions)
    .where(
      and(
        eq(webPushSubscriptions.userId, userId),
        eq(webPushSubscriptions.enabled, true)
      )
    );
}
