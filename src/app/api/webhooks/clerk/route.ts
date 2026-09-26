import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { readRequestContext } from "@/lib/request-context";
import { enforceRateLimit } from "@/services/security/rate-limit";

const emailAddressSchema = z.object({
  id: z.string(),
  email_address: z.string(),
});

const userPayloadSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  primary_email_address_id: z.string().nullable().optional(),
  email_addresses: z.array(emailAddressSchema),
  // R7 — `public_metadata.role` is the source of truth for app role.
  // We accept any record shape and tighten it ourselves.
  public_metadata: z
    .object({
      role: z
        .enum(["student", "teacher", "admin", "parent"])
        .optional(),
    })
    .passthrough()
    .optional(),
});

const deletedUserSchema = z.object({
  id: z.string().nullable(),
  deleted: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  // Resolved lazily per request: on Cloudflare Workers, process.env is
  // populated at request time, not during module evaluation.
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 503 });
  }

  // R0 rate limit: 60 events/minute per source IP (or "unknown" when
  // the request didn't carry one). Clerk signs events so this isn't a
  // spam vector from outside, but it limits misconfigured retry storms
  // and dev-environment replay floods.
  const ctx = readRequestContext(request);
  const rateKey = `ip:${ctx.connectingIp ?? ctx.ip ?? "unknown"}`;
  const blocked = await enforceRateLimit("webhooks.clerk", rateKey);
  if (blocked) return blocked;

  let event;
  try {
    event = await verifyWebhook(request, { signingSecret: webhookSecret });
  } catch (error) {
    console.warn("Clerk webhook verification failed:", error);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  const { type, data } = event;
  const db = getDb();

  try {
    if (type === "user.created") {
      const parsed = userPayloadSchema.safeParse(data);
      if (!parsed.success) {
        console.warn(
          "Skipping user.created: unexpected payload shape.",
          parsed.error.issues,
        );
        return new Response("Skipped", { status: 200 });
      }

      const { id, first_name, last_name, image_url, primary_email_address_id, email_addresses, public_metadata } =
        parsed.data;
      const email = email_addresses.find(
        (address) => address.id === primary_email_address_id,
      )?.email_address;

      if (!email) {
        // Permanent condition — acknowledging prevents Clerk from
        // retrying the event forever. The user can be synced manually.
        console.warn("Skipping user.created: no primary email address.", id);
        return new Response("Skipped", { status: 200 });
      }

      // R7 — public_metadata.role is the source of truth for app role.
      // The admin bootstrap decision (first-ever user → 'admin') still
      // holds: we use it only when role is absent from metadata.
      const metadataRole = public_metadata?.role ?? null;

      // Single-statement upsert: the admin bootstrap decision and the row
      // insert are atomic, so concurrent webhooks cannot produce duplicate
      // admin rows or throw a primary-key conflict error.
      await db.execute(sql`
        INSERT INTO users (id, email, name, image_url, role)
        SELECT ${id}, ${email}, ${`${first_name ?? ""} ${last_name ?? ""}`.trim() || null}, ${image_url},
               CASE
                 WHEN ${metadataRole}::text IS NOT NULL
                   THEN ${metadataRole}::text
                 WHEN (SELECT count(*) FROM users) = 0
                   THEN 'admin'
                 ELSE 'student'
               END
        ON CONFLICT (id) DO NOTHING
      `);
    } else if (type === "user.updated") {
      const parsed = userPayloadSchema.safeParse(data);
      if (!parsed.success) {
        console.warn(
          "Skipping user.updated: unexpected payload shape.",
          parsed.error.issues,
        );
        return new Response("Skipped", { status: 200 });
      }

      const { id, first_name, last_name, image_url, primary_email_address_id, email_addresses, public_metadata } =
        parsed.data;
      const email = email_addresses.find(
        (address) => address.id === primary_email_address_id,
      )?.email_address;

      if (!email) {
        console.warn("Skipping user.updated: no primary email address.", id);
        return new Response("Skipped", { status: 200 });
      }

      // R7 — when public_metadata.role is present, sync it to the local
      // users.role. The mapping is one-way: changes made directly in the
      // local Drizzle UI do NOT flow back to Clerk (Clerk is the source
      // for app role). Other metadata-driven fields could be added here.
      const nextRole = public_metadata?.role ?? null;

      await db
        .update(users)
        .set({
          email,
          name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || null,
          imageUrl: image_url,
          ...(nextRole ? { role: nextRole } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));
    } else if (type === "user.deleted") {
      const parsed = deletedUserSchema.safeParse(data);
      if (!parsed.success || !parsed.data.id) {
        console.warn("Skipping user.deleted: missing user id.", parsed.data?.id);
        return new Response("Skipped", { status: 200 });
      }

      await db.delete(users).where(eq(users.id, parsed.data.id));
    }
  } catch (error) {
    console.error("Clerk webhook handler failed:", error);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}