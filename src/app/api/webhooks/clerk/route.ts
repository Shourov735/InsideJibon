import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { users } from "@/db/schema";

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

      const { id, first_name, last_name, image_url, primary_email_address_id, email_addresses } =
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

      // Single-statement upsert: the admin bootstrap decision and the row
      // insert are atomic, so concurrent webhooks cannot produce duplicate
      // admin rows or throw a primary-key conflict error.
      await db.execute(sql`
        INSERT INTO users (id, email, name, image_url, role)
        SELECT ${id}, ${email}, ${`${first_name ?? ""} ${last_name ?? ""}`.trim() || null}, ${image_url},
               CASE WHEN (SELECT count(*) FROM users) = 0
                    THEN 'admin'::"role" ELSE 'student'::"role" END
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

      const { id, first_name, last_name, image_url, primary_email_address_id, email_addresses } =
        parsed.data;
      const email = email_addresses.find(
        (address) => address.id === primary_email_address_id,
      )?.email_address;

      if (email) {
        await db
          .update(users)
          .set({
            email,
            name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || null,
            imageUrl: image_url,
            updatedAt: new Date(),
          })
          .where(eq(users.id, id));
      }
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