// R9 — One-off helper: generate a VAPID keypair (RFC 8292).
//
// Usage (local):
//   node scripts/generate-vapid-keys.mjs
//
// What to do with the output:
//   1. `NEXT_PUBLIC_VAPID_PUBLIC_KEY=...`  -> .env.local (build-time, inlined
//                                              into the client).
//   2. `VAPID_PRIVATE_KEY=...`             -> never put in .env.local.
//        Instead run, on the operator's workstation:
//          wrangler secret put VAPID_PRIVATE_KEY
//        and paste the value when prompted.
//
// The script is idempotent — re-run to rotate keys (you'll need to push
// a new `NEXT_PUBLIC_VAPID_PUBLIC_KEY` value with the next deploy so
// clients get the new applicationServerKey). Old subscriptions remain
// valid until the device re-registers.
//
// Note: WebCrypto on Node ≥ 19 has `crypto.subtle` on the global. This
// file uses ESM, so `globalThis.crypto.subtle` is the only reliable
// access path.

const crypto = globalThis.crypto;
if (!crypto?.subtle) {
  console.error("WebCrypto not available. Run on Node ≥ 19.");
  process.exit(1);
}

const P256_SPKI_PREFIX = new Uint8Array([
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
  0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00,
]);

function base64url(input) {
  let bytes;
  if (typeof input === "string") bytes = new TextEncoder().encode(input);
  else if (input instanceof Uint8Array) bytes = input;
  else bytes = new Uint8Array(input);
  return Buffer.from(bytes).toString("base64url");
}

const kp = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"]
);

const [rawPublic, rawPrivate] = await Promise.all([
  crypto.subtle.exportKey("raw", kp.publicKey),
  crypto.subtle.exportKey("pkcs8", kp.privateKey),
]);

const publicBytes = new Uint8Array(rawPublic);
const spki = new Uint8Array(P256_SPKI_PREFIX.length + publicBytes.length);
spki.set(P256_SPKI_PREFIX, 0);
spki.set(publicBytes, P256_SPKI_PREFIX.length);

console.log("R9 VAPID keypair generated.");
console.log("");
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + base64url(spki));
console.log("VAPID_PRIVATE_KEY=" + base64url(rawPrivate));
console.log("");
console.log("Add the public key to .env.local (or your platform's client env)");
console.log("provider) and run `wrangler secret put VAPID_PRIVATE_KEY` for the");
console.log("Worker secret. VAPID_SUBJECT should be a mailto: or https: contact,");
console.log('e.g. "mailto:admin@insidejibon.app".');
