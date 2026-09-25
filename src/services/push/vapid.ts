import "server-only";

import { getEnv } from "@/lib/env";

/**
 * R9 — VAPID keypair helpers for Web Push.
 *
 * VAPID (RFC 8292) uses an ECDSA P-256 keypair. Web Push services accept
 * a JWT signed with the **private** key as the Authorization header on
 * outbound dispatches; clients hold the **public** key and pass it to
 * `PushManager.subscribe({ applicationServerKey })`.
 *
 * We generate the keypair ONCE, locally, and bind:
 *   - public  -> NEXT_PUBLIC_VAPID_PUBLIC_KEY  (build-time, client)
 *   - private -> VAPID_PRIVATE_KEY             (Worker secret, never client)
 *
 * No paid SaaS is involved: VAPID is just an ECDSA JWT + a body of
 * standard HTTP. Workers signs the JWT with `crypto.subtle`; nothing
 * leaves our infra beyond the push gateway (Mozilla / Apple / Google).
 *
 * See docs/remaster-phase-9-pwa-proctoring.md §3.2 and FREE-TIER-REFERENCE.md §8.
 */

// WebCrypto SubjectPublicKeyInfo prefix for an uncompressed P-256 key.
// Generated once and shared by the EC public keys we mint below.
const P256_SPKI_PREFIX = new Uint8Array([
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
  0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00,
]);

/**
 * RFC 8292 / RFC 7515 — base64url-encode without padding.
 */
function base64urlEncode(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") bytes = new TextEncoder().encode(input);
  else if (input instanceof Uint8Array) bytes = input;
  else bytes = new Uint8Array(input);

  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  // btoa is available in both Node ≥ 16 and the Workers runtime.
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecodeToBytes(input: string): Uint8Array<ArrayBuffer> {
  // Restore standard base64 padding then decode.
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary =
    typeof atob === "function"
      ? atob(padded)
      : Buffer.from(padded, "base64").toString("binary");
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * One-time generator. Run locally (Node) to mint a keypair; the private
 * key is rotated through `wrangler secret put VAPID_PRIVATE_KEY`. The
 * public key is stored as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
 *
 * This function is never called at runtime — it exists for the
 * `scripts/generate-vapid-keys.mjs` helper and operator documentation.
 */
export async function generateVapidKeys(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const kp = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  )) as CryptoKeyPair;

  const [rawPublic, rawPrivate] = await Promise.all([
    crypto.subtle.exportKey("raw", kp.publicKey),
    crypto.subtle.exportKey("pkcs8", kp.privateKey),
  ]);

  // Build the raw 65-byte uncompressed EC public key and prepend the
  // SubjectPublicKeyInfo header so clients can `importKey("spki", ...)`.
  const publicBytes = new Uint8Array(rawPublic);
  const spki = new Uint8Array(P256_SPKI_PREFIX.length + publicBytes.length);
  spki.set(P256_SPKI_PREFIX, 0);
  spki.set(publicBytes, P256_SPKI_PREFIX.length);

  return {
    publicKey: base64urlEncode(spki),
    privateKey: base64urlEncode(rawPrivate),
  };
}

type CryptoKeyPairRef = { publicKey: CryptoKey; privateKey: CryptoKey };

let keyPairCache: CryptoKeyPairRef | null = null;
let lastEnvSignature = "";

/**
 * Lazily import the VAPID private key. Returns `null` if the runtime is
 * missing the required env var (dev or unconfigured production) — callers
 * must treat push dispatch as a no-op in that branch.
 */
async function getVapidKeyPair(): Promise<CryptoKeyPairRef | null> {
  const env = getEnv();
  const publicKeyB64 = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKeyB64 = env.VAPID_PRIVATE_KEY;
  if (!publicKeyB64 || !privateKeyB64) return null;

  const signature = `${publicKeyB64.slice(0, 8)}:${privateKeyB64.slice(0, 8)}`;
  if (keyPairCache && signature === lastEnvSignature) return keyPairCache;

  const spkiBytes = base64urlDecodeToBytes(publicKeyB64);
  const privateBytes = base64urlDecodeToBytes(privateKeyB64);

  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.importKey(
      "spki",
      spkiBytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    ),
    crypto.subtle.importKey(
      "pkcs8",
      privateBytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    ),
  ]);

  keyPairCache = { publicKey, privateKey };
  lastEnvSignature = signature;
  return keyPairCache;
}

/**
 * RFC 8292 §2 — build the VAPID Authorization header value for an outbound
 * push. The `aud` is the push service origin (e.g. "https://fcm.googleapis.com"),
 * NOT the subscription endpoint path — the gateway routes by path internally.
 *
 * `ttlSec` is the JWT lifetime. Push services reject if the window is too
 * long (>24h) or too short (negative). The spec default is 12h.
 */
export async function buildVapidAuthorization(args: {
  endpoint: string;
  subject: string;
  ttlSec?: number;
}): Promise<string | null> {
  const env = getEnv();
  const subject = args.subject || env.VAPID_SUBJECT || "mailto:admin@insidejibon.app";

  const kp = await getVapidKeyPair();
  if (!kp) return null;

  const audience = new URL(args.endpoint).origin;

  const header = base64urlEncode(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const ttlSec = args.ttlSec ?? 12 * 60 * 60;
  const nowSec = Math.floor(Date.now() / 1000);
  const claims = { aud: audience, exp: nowSec + ttlSec, sub: subject };
  const payload = base64urlEncode(JSON.stringify(claims));

  const signingInput = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    kp.privateKey,
    signingInput
  );

  return `vapid ${header}.${payload}.${base64urlEncode(signature)}`;
}

/**
 * ECDH-ES inner encryption is implemented in `send.ts` — `vapid.ts` owns
 * only JWT/keypair utilities. Re-exported here so callers can `import {
 * generateVapidKeys, buildVapidAuthorization } from "@/services/push/vapid"`.
 */
export const _testing = { base64urlEncode, base64urlDecodeToBytes };

/**
 * Operator helper: returns whether the runtime has a usable VAPID
 * keypair. Used by `/api/health` style endpoints and the smoke checklist.
 */
export async function vapidIsConfigured(): Promise<boolean> {
  const env = getEnv();
  return Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}
