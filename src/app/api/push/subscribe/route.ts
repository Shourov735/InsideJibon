import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { registerSubscription, unregisterSubscription } from "@/services/push/subscriptions";
import { PUSH_CATEGORIES } from "@/db/schema";

/**
 * R9 — Web Push subscribe endpoint.
 *
 * The client posts the SW's `PushSubscription` JSON plus the chosen
 * categories. We upsert into `web_push_subscriptions`, returning 200
 * with the new row id. Idempotent by `endpoint` — re-subscribing on
 * the same device just updates the categories / locale.
 */

const schema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(2048),
    keys: z.object({
      p256dh: z.string().min(1).max(512),
      auth: z.string().min(1).max(64),
    }),
  }),
  categories: z.array(z.string()).max(PUSH_CATEGORIES.length).default([]),
  userAgent: z.string().max(512).optional(),
  locale: z.string().max(8).optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, detail: "unauthenticated" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        detail: parsed.error.issues.map((i) => i.message).join(", "),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const { id } = await registerSubscription({
      userId: user.id,
      subscription: {
        endpoint: parsed.data.subscription.endpoint,
        keys: parsed.data.subscription.keys,
        userAgent: parsed.data.userAgent ?? null,
        locale: parsed.data.locale,
      },
      categories: parsed.data.categories,
    });
    return NextResponse.json(
      { ok: true, id },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, detail: (err as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

const deleteSchema = z.object({
  endpoint: z.string().url().max(2048),
});

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, detail: "unauthenticated" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  const json = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, detail: "missing endpoint" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
  await unregisterSubscription({ userId: user.id, endpoint: parsed.data.endpoint });
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
