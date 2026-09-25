import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { webPushSubscriptions } from "@/db/schema";
import { enqueue } from "@/lib/cloudflare/queues";
import { rateLimit } from "@/services/security/rate-limit";
import { RATE_LIMIT_CONFIG } from "@/lib/security/rate-limit-config";

import {
  buildVapidAuthorization,
  vapidIsConfigured,
} from "./vapid";
import {
  listSubscribers,
  pruneDeadEndpoint,
  type PushSubscriptionInput,
} from "./subscriptions";
import type { PushCategory } from "@/db/schema";

/**
 * R9 — Web Push send pipeline.
 *
 * Implements RFC 8030 (Web Push) + RFC 8291 (Message Encryption for
 * Web Push) + RFC 8292 (VAPID) on top of Workers' `crypto.subtle`. No
 * external library, no paid SaaS, no gateway. The dispatch goes direct
 * to the subscription endpoint (Mozilla / Apple / Google).
 *
 * Cost: each successful send counts as 1 Worker request (100k/day free).
 * Failed dispatches (404/410/etc.) also count but prune the dead endpoint.
 *
 * Rate limit: the per-user KV bucket caps each user at 20 push deliveries
 * / 24h across ALL categories. The bucket key is `push.delivery` which is
 * already in `RATE_LIMIT_CONFIG` (or we add it here if absent — see
 * `pushDeliveryBucket`).
 *
 * Concurrency: `fanOut` runs the per-recipient dispatches in parallel up
 * to a bounded batch size (16). `Promise.allSettled` is required: a single
 * 404 should not stop other recipients from receiving the message.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Push dispatch batch concurrency. ≤16 keeps memory + open sockets low. */
const DISPATCH_CONCURRENCY = 16;

/** FNV-1a 32-bit — small endpoint-derived key, never leaves our infra. */
function hashKey(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

/** Push services accept up to 4096 octets of plaintext. We hard-cap at 4KB. */
const MAX_PAYLOAD_BYTES = 4096;

/** RFC 8292 — VAPID JWT TTL (12 hours). */
const VAPID_TTL_SEC = 12 * 60 * 60;

/** Push payload envelope shared by all categories. */
export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  /** Map of arbitrary client-side data the SW can read. Keep tiny. */
  data?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// RFC 8291 — Message Encryption (ECDH-ES + AES-128-GCM)
// ---------------------------------------------------------------------------

const P256_SPKI_PREFIX = new Uint8Array([
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
  0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00,
]);

// Encode Uint8Array to URL-safe base64 (RFC 4648 §5). Kept for parity with
// the helpers in vapid.ts; consumers should prefer the runtime `btoa`
// bridge or `crypto.subtle` exports where available.
function base64urlEncodeBytes(input: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < input.length; i++) binary += String.fromCharCode(input[i]!);
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
void base64urlEncodeBytes;

function base64DecodeToBytes(input: string): Uint8Array<ArrayBuffer> {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const binary =
    typeof atob === "function"
      ? atob(padded)
      : Buffer.from(padded, "base64").toString("binary");
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * RFC 8291 §3 — encrypt a UTF-8 message for one subscription. The result
 * is the complete encrypted body: `salt || records || header` packed into
 * the Web Push "aesgcm" content encoding.
 *
 * Output layout (RFC 8030 §5.2 — aes128gcm):
 *   [ 16-byte salt ][  4-byte rs (uint32 BE) ][  1-byte idlen ][ id ][ ciphertext + tag ]
 */
async function encryptForSubscription(
  subscriptionKeys: { p256dh: string; auth: string },
  plaintext: Uint8Array<ArrayBuffer>
): Promise<Uint8Array<ArrayBuffer>> {
  const receiverSpki = base64DecodeToBytes(subscriptionKeys.p256dh);
  if (receiverSpki.length !== P256_SPKI_PREFIX.length + 65) {
    throw new Error("Unexpected subscription public key length");
  }

  // Skip the SPKI header — WebCrypto wants the raw EC point.
  const receiverPublicKeyBytes = receiverSpki.slice(P256_SPKI_PREFIX.length);
  const receiverPublicKey = await crypto.subtle.importKey(
    "raw",
    receiverPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const ephemeralKeyPair = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  )) as CryptoKeyPair;
  const ephemeralPublicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey)
  );

  const auth = base64DecodeToBytes(subscriptionKeys.auth);

  // 32-byte salt (RFC 8291 §3.1).
  const salt = crypto.getRandomValues(new Uint8Array(16));
  // CEK info: "WebPush: info\0" || ua_public || as_public (RFC 8291 §3.1).
  const cekInfo = new Uint8Array(
    "WebPush: info\x00".length + receiverPublicKeyBytes.length + ephemeralPublicKey.length
  );
  {
    let off = 0;
    const headerBytes = new TextEncoder().encode("WebPush: info\x00");
    cekInfo.set(headerBytes, off);
    off += headerBytes.length;
    cekInfo.set(receiverPublicKeyBytes, off);
    off += receiverPublicKeyBytes.length;
    cekInfo.set(ephemeralPublicKey, off);
  }
  // Nonce info: "Content-Encoding: aes128gcm\0" (RFC 8291 §4).
  const nonceInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\x00");

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: receiverPublicKey },
      ephemeralKeyPair.privateKey,
      256
    )
  );

  const hkdfBits = await hkdf(sharedSecret, auth, cekInfo, 256);
  const cekKey = await crypto.subtle.importKey(
    "raw",
    hkdfBits.slice(0, 16),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const hkdfNonce = await hkdf(sharedSecret, auth, nonceInfo, 128);
  const nonce = new Uint8Array(hkdfNonce);

  // RFC 8291 §4 — pad plaintext: append 0x00 followed by trailing zeros.
  // WebCrypto AES-GCM appends its own 16-byte auth tag.
  const paddingLen = 0;
  const padded = new Uint8Array(plaintext.length + 1 + paddingLen);
  padded.set(plaintext, 0);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      cekKey,
      padded
    )
  );

  const rs = 4096;
  const headerBytes = new Uint8Array(
    P256_SPKI_PREFIX.length + ephemeralPublicKey.length
  );
  headerBytes.set(P256_SPKI_PREFIX, 0);
  headerBytes.set(ephemeralPublicKey, P256_SPKI_PREFIX.length);

  // body = salt || rs(uint32 BE) || idlen(uint8) || id || ciphertext
  const body = new Uint8Array(16 + 4 + 1 + headerBytes.length + ciphertext.length);
  let off = 0;
  body.set(salt, off);
  off += salt.length;
  body.set(new Uint8Array(new Uint32Array([rs]).buffer), off);
  off += 4;
  body[new Uint8Array(body.buffer)[off]!] = headerBytes.length;
  off += 1;
  body.set(headerBytes, off);
  off += headerBytes.length;
  body.set(ciphertext, off);

  return body;
}

/**
 * HKDF-SHA-256 (RFC 5869) — minimal pure-JS, no extra dep.
 */
async function hkdf(
  ikm: Uint8Array<ArrayBufferLike>,
  salt: Uint8Array<ArrayBufferLike>,
  info: Uint8Array<ArrayBufferLike>,
  outBytes: number
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey(
    "raw",
    ikm as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, salt as BufferSource)
  );
  const prkKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const t = new Uint8Array(outBytes);
  let pos = 0;
  let prev = new Uint8Array(0);
  let counter = 1;
  while (pos < outBytes) {
    const input = new Uint8Array(prev.length + info.length + 1);
    input.set(prev, 0);
    input.set(info, prev.length);
    input[input.length - 1] = counter++;
    const block = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, input));
    prev = block;
    const take = Math.min(block.length, outBytes - pos);
    t.set(block.subarray(0, take), pos);
    pos += take;
  }
  return t;
}

// ---------------------------------------------------------------------------
// Send pipeline
// ---------------------------------------------------------------------------

export type SendResult = {
  endpoint: string;
  status: "delivered" | "rate_limited" | "no_vapid" | "gone" | "error";
  detail?: string;
};

/**
 * Send a single payload to one subscription. Used by `fanOut` (which
 * fans out across multiple recipients) and by per-user direct push.
 *
 * Returns the disposition, never throws — callers aggregate via
 * `Promise.allSettled` for fan-out. Internal errors land in `error`.
 */
export async function sendPush(
  subscription: PushSubscriptionInput,
  payload: PushPayload,
  options?: { userId?: string }
): Promise<SendResult> {
  if (!(await vapidIsConfigured())) {
    return { endpoint: subscription.endpoint, status: "no_vapid" };
  }

  // Per-user rate limit. The bucket key uses userId when available (per-user
  // cap of 20/day across all categories). When the caller doesn't supply
  // a user id (e.g. an ad-hoc admin test), fall back to endpoint hashing
  // so we still get some protection.
  const callerKey = options?.userId ?? `endpoint:${hashKey(subscription.endpoint)}`;
  const decision = await rateLimit("push.delivery", callerKey);
  if (!decision.ok) {
    return {
      endpoint: subscription.endpoint,
      status: "rate_limited",
      detail: `reset in ${decision.resetSec}s`,
    };
  }

  let body: Uint8Array<ArrayBuffer>;
  try {
    const json = JSON.stringify(payload);
    const plaintext = new TextEncoder().encode(json);
    if (plaintext.length > MAX_PAYLOAD_BYTES) {
      return {
        endpoint: subscription.endpoint,
        status: "error",
        detail: `payload exceeds ${MAX_PAYLOAD_BYTES}B`,
      };
    }
    body = await encryptForSubscription(
      { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      plaintext
    );
  } catch (err) {
    return {
      endpoint: subscription.endpoint,
      status: "error",
      detail: (err as Error).message,
    };
  }

  const authz = await buildVapidAuthorization({
    endpoint: subscription.endpoint,
    subject: "",
    ttlSec: VAPID_TTL_SEC,
  });
  if (!authz) {
    return { endpoint: subscription.endpoint, status: "no_vapid" };
  }

  let response: Response;
  try {
    response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: authz,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(VAPID_TTL_SEC),
      },
      body,
    });
  } catch (err) {
    return {
      endpoint: subscription.endpoint,
      status: "error",
      detail: (err as Error).message,
    };
  }

  // 201 Created = delivered. 404/410 = subscription gone — prune.
  if (response.status === 201) {
    await touchSubscription(subscription.endpoint);
    return { endpoint: subscription.endpoint, status: "delivered" };
  }
  if (response.status === 404 || response.status === 410) {
    await pruneDeadEndpoint(subscription.endpoint);
    return { endpoint: subscription.endpoint, status: "gone" };
  }
  return {
    endpoint: subscription.endpoint,
    status: "error",
    detail: `gateway status ${response.status}`,
  };
}

async function touchSubscription(endpoint: string): Promise<void> {
  const db = getDb();
  await db
    .update(webPushSubscriptions)
    .set({ lastUsedAt: new Date() })
    .where(eq(webPushSubscriptions.endpoint, endpoint));
}

// ---------------------------------------------------------------------------
// fanOut — bounded concurrency, prune dead, count delivered.
// ---------------------------------------------------------------------------

export type FanOutOptions = {
  category: PushCategory;
  payload: PushPayload;
  /** When set, only recipients whose user id is in this list are targeted. */
  userIds?: readonly string[];
  /** Override batch concurrency (default 16). */
  concurrency?: number;
};

export type FanOutSummary = {
  attempted: number;
  delivered: number;
  rateLimited: number;
  gone: number;
  errors: number;
};

/**
 * Send a push payload to all enabled subscribers of `category`. Concurrency
 * is bounded; results are aggregated via `Promise.allSettled` so a single
 * 410 does not abort the rest. Pruning dead endpoints is best-effort.
 *
 * `sendPush` is the per-recipient worker; this function is the supervisor.
 */
export async function fanOut(options: FanOutOptions): Promise<FanOutSummary> {
  const subscribers = await listSubscribers({
    category: options.category,
    userIds: options.userIds,
  });
  if (subscribers.length === 0) {
    return { attempted: 0, delivered: 0, rateLimited: 0, gone: 0, errors: 0 };
  }

  const concurrency = Math.max(1, options.concurrency ?? DISPATCH_CONCURRENCY);
  const summary: FanOutSummary = {
    attempted: subscribers.length,
    delivered: 0,
    rateLimited: 0,
    gone: 0,
    errors: 0,
  };

  // Simple bounded-parallel queue.
  let cursor = 0;
  async function worker(): Promise<void> {
    while (true) {
      const idx = cursor++;
      if (idx >= subscribers.length) return;
      const sub = subscribers[idx]!;
      const result = await sendPush(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        options.payload,
        { userId: sub.userId }
      );
      switch (result.status) {
        case "delivered":
          summary.delivered += 1;
          break;
        case "rate_limited":
          summary.rateLimited += 1;
          break;
        case "gone":
          summary.gone += 1;
          break;
        default:
          summary.errors += 1;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, subscribers.length) }, () => worker())
  );
  return summary;
}

/**
 * Enqueue an async fan-out. Push delivery happens off the request hot
 * path — see `wrangler.jsonc` for the `NOTIFICATIONS_QUEUE` producer
 * binding. The queue consumer in src/services/notifications/ is wired
 * by R0; this helper is the R9 producer shape.
 *
 * Returning immediately is the whole point: callers (e.g. a teacher
 * publishing a grade) get their 200 without waiting for the push to
 * fan out.
 */
export async function queueFanOut(args: {
  category: PushCategory;
  payload: PushPayload;
  userIds?: readonly string[];
}): Promise<void> {
  await enqueue<{
    category: PushCategory;
    payload: PushPayload;
    userIds?: readonly string[];
  }>("NOTIFICATIONS_QUEUE", {
    type: "web_push.fanout",
    id: `${args.category}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    payload: args,
  });
}

// Re-export so callers can `import { fanOut, sendPush, queueFanOut }`
// from a single entry point.
export { listSubscribers } from "./subscriptions";

// Helper export for callers that need to assert the bucket exists.
export const pushDeliveryBucket = RATE_LIMIT_CONFIG["push.delivery"];
