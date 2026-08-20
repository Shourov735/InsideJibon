import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb } from "@/db";
import { users } from "@/db/schema";

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
    console.error("Clerk webhook verification failed:", error);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  const { type, data } = event;
  const db = getDb();

  try {
    if (type === "user.created") {
      const email = data.email_addresses.find(
        (address) => address.id === data.primary_email_address_id,
      )?.email_address;

      if (!email) {
        console.error("user.created without primary email", data.id);
        return new Response("Missing email", { status: 400 });
      }

      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.id, data.id))
        .limit(1);

      if (!existing) {
        const [{ count }] = await db
          .select({ count: sqlCount() })
          .from(users);

        // Bootstrap: the very first user of the platform becomes admin.
        await db.insert(users).values({
          id: data.id,
          email,
          name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || null,
          imageUrl: data.image_url,
          role: count === 0 ? "admin" : "student",
        });
      }
    } else if (type === "user.updated") {
      const email = data.email_addresses.find(
        (address) => address.id === data.primary_email_address_id,
      )?.email_address;

      if (email) {
        await db
          .update(users)
          .set({
            email,
            name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || null,
            imageUrl: data.image_url,
            updatedAt: new Date(),
          })
          .where(eq(users.id, data.id));
      }
    } else if (type === "user.deleted") {
      if (data.id) {
        await db.delete(users).where(eq(users.id, data.id));
      }
    }
  } catch (error) {
    console.error("Clerk webhook handler failed:", error);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

function sqlCount() {
  return sql`count(*)::int`;
}