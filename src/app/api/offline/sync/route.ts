import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { OFFLINE_OUTBOX_KINDS } from "@/db/schema";
import {
  markOutboxSynced,
  replayOutboxEntry,
} from "@/services/pwa/offline-sync";
import { rateLimit } from "@/services/security/rate-limit";

/**
 * R9 — Offline outbox sync endpoint.
 *
 * The service worker POSTs one queued entry per call:
 *
 *   POST /api/offline/sync
 *   { client_id, kind, payload }
 *
 * The handler:
 *   1. Authenticates the caller — must be the same user who queued the
 *      entry (the SW stamps `client_id` from the device; we cross-check
 *      by matching `(user_id, client_id)` on UPDATE).
 *   2. Rate-limits per-user (push.delivery bucket doubles; or we add a
 *      dedicated bucket — for R9 the assignment.submit bucket is fine).
 *   3. Replays the entry, marks synced if successful, returns the
 *      disposition to the SW.
 *
 * Idempotency: the unique `(user_id, client_id)` constraint plus the
 * `isNull(syncedAt)` guard means a re-posted entry is detected and the
 * UPDATE is a no-op. The SW sees a 200 and prunes the row from IDB.
 */

const payloadSchema = z.object({
  clientId: z.string().min(1).max(128),
  kind: z.enum(OFFLINE_OUTBOX_KINDS),
  payload: z.unknown(),
  createdAt: z.string().optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, terminal: true, detail: "invalid json" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        terminal: true,
        detail: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", "),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    // Auth required: do not reveal whether the entry would have replayed.
    return NextResponse.json(
      { ok: false, terminal: true, detail: "unauthenticated" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Bucket reuses push.delivery — 20/day/user. Outbox replays are rare
  // events; the same limit keeps a stuck SW from melting the DB.
  const decision = await rateLimit("push.delivery", user.id);
  if (!decision.ok) {
    return NextResponse.json(
      {
        ok: false,
        terminal: false,
        detail: `rate limited; reset in ${decision.resetSec}s`,
      },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  const result = await replayOutboxEntry({
    userId: user.id,
    clientId: parsed.data.clientId,
    kind: parsed.data.kind,
    payload: parsed.data.payload,
  });

  // Both successful replays and terminal failures mark the entry synced,
  // so the SW prunes the row. Permanent failures still return 200 — the
  // SW treats non-200 as "keep retrying" which would loop forever on a
  // validation error.
  await markOutboxSynced({ userId: user.id, clientId: parsed.data.clientId });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json(
    { ok: true, userId: user.id },
    { headers: { "Cache-Control": "no-store" } }
  );
}
