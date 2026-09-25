import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Typed producer for the Cloudflare Queues bindings introduced in the
 * R0 remaster (see docs/remaster-phase-0-foundation.md §3.1 and §5):
 *
 * - `NOTIFICATIONS_QUEUE` — fan-out: in-app + email + web push.
 * - `EMBEDDINGS_QUEUE`    — background AI embedding generation (R8).
 * - `EXPORT_QUEUE`        — long-running CSV / report generation.
 *
 * Queues are free in the Workers Free plan: 1M messages/month. Producer
 * and consumer are both free. We never include a paid tier. See
 * FREE-TIER-REFERENCE.md §4.
 *
 * Bindings are resolved lazily per call. In Node dev the producer is a
 * no-op that logs and returns; production callers never need to special-
 * case Node.
 */

export type QueueBindingName =
  | "NOTIFICATIONS_QUEUE"
  | "EMBEDDINGS_QUEUE"
  | "EXPORT_QUEUE";

export type QueueEnvelope<T> = {
  /** Schema-versioned payload envelope. Bump `v` on breaking changes. */
  v: 1;
  /** Domain-level message type, e.g. "notifications.fanout". */
  type: string;
  /** Application-stable id used for idempotency / dedupe. */
  id: string;
  /** When the message was enqueued (ISO 8601 UTC). */
  enqueuedAt: string;
  /** Payload (caller-defined). */
  payload: T;
};

export type QueueLike = {
  send(message: unknown): Promise<void>;
  sendBatch(messages: unknown[]): Promise<void>;
};

async function resolveQueue(
  name: QueueBindingName
): Promise<QueueLike | null> {
  let env: Record<string, unknown>;
  try {
    const ctx = await getCloudflareContext({ async: true });
    env = ctx.env as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
  const binding = env[name];
  if (!binding || typeof (binding as QueueLike).send !== "function") {
    return null;
  }
  return binding as QueueLike;
}

/**
 * Enqueue a typed message onto one of the Workers Queues. Returns silently
 * (no-op) when the binding is not configured (Node dev) — production
 * callers will never see the no-op branch because wrangler.jsonc declares
 * the bindings.
 */
export async function enqueue<T>(
  queueName: QueueBindingName,
  envelope: Omit<QueueEnvelope<T>, "v" | "enqueuedAt">
): Promise<void> {
  const queue = await resolveQueue(queueName);
  if (!queue) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[queues] binding "${queueName}" missing — message dropped in dev.`
      );
    }
    return;
  }

  const message: QueueEnvelope<T> = {
    v: 1,
    enqueuedAt: new Date().toISOString(),
    ...envelope,
  };

  try {
    await queue.send(message);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[queues] enqueue failed for ${queueName}:`, error);
    } else {
      throw error;
    }
  }
}
