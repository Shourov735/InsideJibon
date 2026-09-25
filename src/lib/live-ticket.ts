import "server-only";

import { getEnv } from "@/lib/env";

/**
 * R3 — Live class WebSocket ticket helper.
 *
 * The Durable Object (`ClassroomRoom`) cannot verify Clerk session cookies
 * — it lives outside the Worker fetch pipeline and only sees whatever the
 * Worker hands it. To gate WebSocket access, the HTTP route mints a
 * short-lived HMAC-signed ticket that the DO verifies on the first
 * `presence.join` message after upgrade.
 *
 * Ticket shape (compact, base64url-encoded JSON):
 *   { v: 1, uid, sid, role, iat, exp, sig }
 *
 *   - `v`        — schema version (bump on breaking changes)
 *   - `uid`      — Clerk user id (subject)
 *   - `sid`      — class session id (uuid)
 *   - `role`     — 'teacher' | 'student'
 *   - `iat`      — issued-at (unix seconds)
 *   - `exp`      — expiry (unix seconds)
 *   - `sig`      — HMAC-SHA-256 of the canonical payload (everything except
 *                  `sig` itself), base64url-encoded
 *
 * `CLASSROOM_TICKET_SECRET` is set via `wrangler secret put` (never
 * inlined into the client). In Node dev the env var is required and the
 * helper throws if it is missing — there's no usable fallback for this
 * primitive.
 *
 * Default TTL is 5 minutes per docs/remaster-phase-3-live-class.md §6
 * ("Ticket TTL: 5 min").
 */

const TICKET_VERSION = 1 as const;
const DEFAULT_TTL_SECONDS = 5 * 60;

export type TicketRole = "teacher" | "student";

export type SignTicketInput = {
  userId: string;
  sessionId: string;
  role: TicketRole;
  /** Optional TTL override; defaults to 5 minutes. */
  ttl?: number;
};

export type ClassroomTicket = {
  v: 1;
  uid: string;
  sid: string;
  role: TicketRole;
  iat: number;
  exp: number;
  sig: string;
};

/**
 * The mintable form of the ticket — everything except the signature.
 * Kept separate from `ClassroomTicket` so callers and tests can build
 * deterministic test vectors without signing.
 */
export type TicketPayload = Omit<ClassroomTicket, "sig">;

const ENCODER = new TextEncoder();

/** Base64url helpers (no padding) — Worker & Node safe. */
function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): Uint8Array {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const binary =
    typeof atob === "function"
      ? atob(padded)
      : Buffer.from(padded, "base64").toString("binary");
  // Allocate on a fresh ArrayBuffer so the resulting view is backed by
  // ArrayBuffer (not SharedArrayBuffer) — required by TS strict
  // typing of `crypto.subtle.verify`.
  const buf = new ArrayBuffer(binary.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Wrap a Uint8Array in a fresh ArrayBuffer so the resulting view is
 * `Uint8Array<ArrayBuffer>` (not `Uint8Array<ArrayBufferLike>`).
 * Used to satisfy `crypto.subtle.verify`'s strict `BufferSource` typing.
 */
function asArrayBufferBytes(input: Uint8Array): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(input.byteLength);
  const out = new Uint8Array(buf);
  out.set(input);
  return out;
}

/**
 * Canonical JSON serialization — keys in stable order so the signature
 * is reproducible. Matches the DO verifier exactly.
 */
function canonicalize(payload: TicketPayload): string {
  const ordered = {
    v: payload.v,
    uid: payload.uid,
    sid: payload.sid,
    role: payload.role,
    iat: payload.iat,
    exp: payload.exp,
  };
  return JSON.stringify(ordered);
}

async function getSecretKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function assertRole(role: string): TicketRole {
  if (role === "teacher" || role === "student") return role;
  throw new Error(`Invalid ticket role: ${role}`);
}

/**
 * Sign a classroom ticket. The DO and the Worker both compute the
 * signature over the canonical payload, so this helper is the *only*
 * place that needs the secret.
 */
export async function signClassroomTicket(
  input: SignTicketInput
): Promise<ClassroomTicket> {
  const env = getEnv();
  if (!env.CLASSROOM_TICKET_SECRET) {
    throw new Error("CLASSROOM_TICKET_SECRET is not configured.");
  }
  const role = assertRole(input.role);
  const now = Math.floor(Date.now() / 1000);
  const ttl = input.ttl ?? DEFAULT_TTL_SECONDS;
  const payload: TicketPayload = {
    v: TICKET_VERSION,
    uid: input.userId,
    sid: input.sessionId,
    role,
    iat: now,
    exp: now + ttl,
  };

  const key = await getSecretKey(env.CLASSROOM_TICKET_SECRET);
  const sigBytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, ENCODER.encode(canonicalize(payload)))
  );

  return {
    ...payload,
    sig: base64urlEncode(sigBytes),
  };
}

/**
 * Encode a ticket into a base64url string for transport over the WS
 * upgrade handshake (typically via the `Sec-WebSocket-Protocol` header
 * or the URL query — see the API route for the chosen channel).
 */
export function encodeTicket(ticket: ClassroomTicket): string {
  return base64urlEncode(ENCODER.encode(JSON.stringify(ticket)));
}

/**
 * Parse a base64url-encoded ticket back into its structured form. No
 * signature verification happens here — callers MUST call
 * `verifyClassroomTicket` to authenticate.
 */
export function decodeTicket(raw: string): ClassroomTicket | null {
  if (!raw || typeof raw !== "string") return null;
  let bytes: Uint8Array;
  try {
    bytes = base64urlDecode(raw);
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const t = parsed as Partial<ClassroomTicket>;
  if (
    t.v !== TICKET_VERSION ||
    typeof t.uid !== "string" ||
    typeof t.sid !== "string" ||
    typeof t.role !== "string" ||
    typeof t.iat !== "number" ||
    typeof t.exp !== "number" ||
    typeof t.sig !== "string"
  ) {
    return null;
  }
  return {
    v: TICKET_VERSION,
    uid: t.uid,
    sid: t.sid,
    role: assertRole(t.role),
    iat: t.iat,
    exp: t.exp,
    sig: t.sig,
  };
}

export type VerifyResult =
  | { ok: true; ticket: ClassroomTicket }
  | { ok: false; reason: "malformed" | "expired" | "bad_signature" };

/**
 * Verify a raw ticket string. Used by the DO on the first
 * `presence.join` message — the DO does not have access to the env
 * helper, so the HTTP route verifies before upgrade AND the client
 * resends the ticket as the first WS frame so the DO can re-verify
 * (DO holds the same secret via env binding).
 */
export async function verifyClassroomTicket(
  raw: string
): Promise<VerifyResult> {
  const ticket = decodeTicket(raw);
  if (!ticket) return { ok: false, reason: "malformed" };

  const now = Math.floor(Date.now() / 1000);
  if (ticket.exp <= now) return { ok: false, reason: "expired" };

  const env = getEnv();
  if (!env.CLASSROOM_TICKET_SECRET) {
    return { ok: false, reason: "malformed" };
  }

  const { sig, ...payload } = ticket;
  const key = await getSecretKey(env.CLASSROOM_TICKET_SECRET);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    asArrayBufferBytes(base64urlDecode(sig)),
    asArrayBufferBytes(ENCODER.encode(canonicalize(payload))),
  );
  if (!valid) return { ok: false, reason: "bad_signature" };
  return { ok: true, ticket };
}

/**
 * Synchronous-style signature verifier for the DO. The DO runs in a
 * Workers isolate that has `crypto.subtle` available, so we can call
 * this inside `webSocketMessage` without crossing async boundaries
 * the Worker can't reach.
 *
 * Returns the parsed ticket on success, or an error reason.
 */
export async function verifyTicketPayload(
  ticket: ClassroomTicket,
  secret: string
): Promise<VerifyResult> {
  const now = Math.floor(Date.now() / 1000);
  if (ticket.exp <= now) return { ok: false, reason: "expired" };
  const { sig, ...payload } = ticket;
  const key = await getSecretKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    asArrayBufferBytes(base64urlDecode(sig)),
    asArrayBufferBytes(ENCODER.encode(canonicalize(payload))),
  );
  if (!valid) return { ok: false, reason: "bad_signature" };
  return { ok: true, ticket };
}
