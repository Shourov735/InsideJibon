import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  // Build-time inlined by Next.js into client/server bundles. It is NOT a
  // Workers runtime binding, so it must stay optional here — only
  // client-side Clerk components consume it (inlined at build time).
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  // Required for Clerk webhook user sync in deployed environments.
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // --- R0 remaster infra (optional; see wrangler.jsonc) ---
  // KV mirror URLs used by `wrangler dev` to talk to remote KV from a
  // local machine. Workers runtime accesses the bindings directly via
  // `getCloudflareContext`, so these are not consulted in production.
  RATE_LIMIT_KV_URL: z.string().optional(),
  SESSION_KV_URL: z.string().optional(),
  FEATURE_FLAGS_KV_URL: z.string().optional(),
  // Public origin configured for the insidejibon-public R2 bucket.
  // Required to construct asset URLs once the bucket has a custom domain.
  PUBLIC_BUCKET_PUBLIC_URL: z.string().optional(),
  NEXT_PUBLIC_PUBLIC_BUCKET_URL: z.string().optional(),

  // --- R9 Web Push (VAPID) ---
  // Public half of the VAPID keypair, shipped to the client (used by the
  // service worker to subscribe). Build-time inlined by Next.js, like
  // NEXT_PUBLIC_CLERK_*. Generated via `scripts/generate-vapid-keys.mjs`.
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  // Private half — Worker secret ONLY. Never inlined into the client.
  // Used to sign the VAPID JWT for outbound push dispatches.
  VAPID_PRIVATE_KEY: z.string().optional(),
  // Operator-tunable contact for VAPID `sub:` (mailto or https). Many push
  // services reject dispatches without a `sub:` claim.
  VAPID_SUBJECT: z.string().optional(),

  // --- R3 Live Class (Durable Object + YouTube Live) ---
  // Shared HMAC secret used by the Worker to sign short-lived WS
  // tickets. The DO verifies with the same secret via its env binding.
  // Operator action: `wrangler secret put CLASSROOM_TICKET_SECRET`.
  CLASSROOM_TICKET_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Validated environment variables, resolved lazily.
 * On Cloudflare Workers (OpenNext) process.env is populated per request,
 * so module-scope validation would fail during worker instantiation.
 */
export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid environment variables: ${missing}`);
  }

  cached = parsed.data;
  return cached;
}