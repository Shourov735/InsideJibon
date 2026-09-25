import "server-only";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  emailUnsubscribes,
  type EmailCategory,
  type EmailUnsubscribe,
  UNSUBSCRIBEABLE_CATEGORIES,
} from "@/db/schema";

/**
 * R10 — Email unsubscribe service.
 *
 * Each call is idempotent on (email, category). The combination is
 * UNIQUE in the table so concurrent calls collapse to one row. We
 * delete-then-insert vs upsert on the (email, category) pair to keep
 * `reason` nullable and `user_id` mutable — the schema favours
 * DELETE + INSERT when a user re-subscribes after unsubscribing.
 *
 * Transactional categories (receipts, refunds, grade posted) cannot be
 * unsubscribed from — they are required for compliance (Bangladesh
 * DPDT + financial record-keeping). The R10 phase doc §5 calls this
 * out explicitly. We enforce by throwing on `transactional`.
 *
 * We deliberately do NOT consult a KV cache here: this is a write path
 * and the read path (`isUnsubscribed`) only runs on the hot sendEmail
 * route — KV caching of suppression state is added in §3.1 of the
 * phase doc and lives next to `sendEmail()`.
 */

export class NotUnsubscribableError extends Error {
  constructor(public category: string) {
    super(
      `Category "${category}" cannot be unsubscribed from — it is required for compliance.`
    );
  }
}

export class InvalidCategoryError extends Error {
  constructor(public category: string) {
    super(`Unknown email category "${category}".`);
  }
}

export function isUnsubscribable(category: EmailCategory): boolean {
  return (
    UNSUBSCRIBEABLE_CATEGORIES as readonly string[]
  ).includes(category);
}

export async function addUnsubscribe(input: {
  email: string;
  category: EmailCategory;
  userId?: string | null;
  reason?: string;
}): Promise<EmailUnsubscribe> {
  if (input.category === "transactional") {
    throw new NotUnsubscribableError(input.category);
  }
  if (!isUnsubscribable(input.category)) {
    throw new InvalidCategoryError(input.category);
  }
  const db = getDb();
  // Idempotent: delete existing row first (UNIQUE on (email, category)).
  await db
    .delete(emailUnsubscribes)
    .where(
      and(
        eq(emailUnsubscribes.email, input.email),
        eq(emailUnsubscribes.category, input.category)
      )
    );
  const [row] = await db
    .insert(emailUnsubscribes)
    .values({
      email: input.email,
      category: input.category,
      userId: input.userId ?? null,
      reason: input.reason ?? null,
    })
    .returning();
  return row;
}

export async function removeUnsubscribe(input: {
  email: string;
  category: EmailCategory;
}): Promise<void> {
  if (!isUnsubscribable(input.category) && input.category !== "transactional") {
    throw new InvalidCategoryError(input.category);
  }
  const db = getDb();
  await db
    .delete(emailUnsubscribes)
    .where(
      and(
        eq(emailUnsubscribes.email, input.email),
        eq(emailUnsubscribes.category, input.category)
      )
    );
}

export async function getUnsubscribesForEmail(
  email: string
): Promise<EmailUnsubscribe[]> {
  const db = getDb();
  return db
    .select()
    .from(emailUnsubscribes)
    .where(eq(emailUnsubscribes.email, email));
}

export async function isUnsubscribed(
  email: string,
  category: EmailCategory
): Promise<boolean> {
  if (!isUnsubscribable(category)) return false; // transactional never suppressed
  const db = getDb();
  const [row] = await db
    .select({ id: emailUnsubscribes.id })
    .from(emailUnsubscribes)
    .where(
      and(
        eq(emailUnsubscribes.email, email),
        eq(emailUnsubscribes.category, category)
      )
    )
    .limit(1);
  return Boolean(row);
}
