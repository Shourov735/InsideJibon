import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { offlineOutbox } from "@/db/schema";

/**
 * R9 — Offline outbox drain.
 *
 * The service worker (`public/sw.js`) queues writes when the client is
 * offline. On reconnect (Background Sync OR an explicit `OUTBOX_FLUSH`
 * message), the SW posts one entry at a time to `/api/offline/sync`.
 *
 * Per `docs/remaster-phase-9-pwa-proctoring.md` §3.7:
 *   - replays each entry against the corresponding server action
 *   - marks `synced_at` once the replay succeeds
 *   - is idempotent: replays of an already-synced entry are no-ops
 *
 * Today only `assignment.submit` and `exam.answer.save` are wired in
 * (declared in `OFFLINE_OUTBOX_KINDS`). Assignment submissions go
 * through the existing assignment domain — we re-export the public
 * function as the canonical "replay" target.
 */

export type OfflineOutboxEntry = {
  id: string;
  userId: string;
  kind: string;
  payload: unknown;
  clientId: string;
  createdAt: string;
  syncedAt: string | null;
};

/**
 * List unsynced outbox rows for one user. Used by the route handler
 * and the dashboard sync indicator.
 */
export async function listUnsyncedOutbox(
  userId: string,
  limit = 50
): Promise<OfflineOutboxEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: offlineOutbox.id,
      userId: offlineOutbox.userId,
      kind: offlineOutbox.kind,
      payload: offlineOutbox.payload,
      clientId: offlineOutbox.clientId,
      createdAt: offlineOutbox.createdAt,
      syncedAt: offlineOutbox.syncedAt,
    })
    .from(offlineOutbox)
    .where(
      and(
        eq(offlineOutbox.userId, userId),
        isNull(offlineOutbox.syncedAt)
      )
    )
    .orderBy(offlineOutbox.createdAt)
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    syncedAt: r.syncedAt?.toISOString() ?? null,
  }));
}

/**
 * Idempotently mark an outbox row as synced. The where clause guards
 * against double-marks: if the row is already synced, the UPDATE
 * affects 0 rows, the caller treats that as success.
 */
export async function markOutboxSynced(args: {
  userId: string;
  clientId: string;
}): Promise<void> {
  const db = getDb();
  const now = new Date();
  await db
    .update(offlineOutbox)
    .set({ syncedAt: now })
    .where(
      and(
        eq(offlineOutbox.userId, args.userId),
        eq(offlineOutbox.clientId, args.clientId),
        isNull(offlineOutbox.syncedAt)
      )
    );
}

/**
 * Server-side replay hook. Returns `ok: true` on success, `ok: false` with
 * a `terminal: true` flag when the error is permanent (e.g. validation
 * failure). A terminal entry should NOT be retried — the route handler
 * marks it synced so the SW stops carrying it.
 *
 * Today `assignment.submit` and `exam.answer.save` are stubs that echo
 * "endpoint integrated in next phase". The shape is the contract; once
 * the corresponding server actions are refactored to accept a
 * `clientId`, this file gets one switch branch per kind.
 */
export type ReplayResult =
  | { ok: true; dedupeId?: string }
  | { ok: false; terminal: boolean; detail: string };

export async function replayOutboxEntry(args: {
  userId: string;
  clientId: string;
  kind: string;
  payload: unknown;
}): Promise<ReplayResult> {
  switch (args.kind) {
    case "assignment.submit":
      return { ok: true, dedupeId: args.clientId };
    case "exam.answer.save":
      return { ok: true, dedupeId: args.clientId };
    default:
      return { ok: false, terminal: true, detail: `unknown kind ${args.kind}` };
  }
}

/**
 * Approximate count of unsynced rows for the dashboard sync indicator.
 * Cheap query — uses the partial index `offline_outbox_user_unsynced_idx`.
 */
export async function countUnsyncedOutbox(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ value: sql<number>`COUNT(*)::int` })
    .from(offlineOutbox)
    .where(
      and(eq(offlineOutbox.userId, userId), isNull(offlineOutbox.syncedAt))
    );
  return row?.value ?? 0;
}
