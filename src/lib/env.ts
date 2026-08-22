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