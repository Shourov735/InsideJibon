import "server-only";
import { verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getEnv } from "@/lib/env";

export type CurrentUser = typeof users.$inferSelect;

export type ResolvedSession =
  | { status: "authenticated"; user: CurrentUser }
  | { status: "unknown-token"; user: null }
  | { status: "not-synced"; user: null };

/**
 * Resolves the application user for the authenticated Clerk session.
 *
 * The Clerk session token (__session cookie) is verified against the
 * Clerk instance's JWKS before any user ID is trusted — never trust
 * client-provided IDs. Token verification is done manually because
 * Clerk's middleware (which normally provides auth context) cannot run
 * on Cloudflare Workers (Next.js 16 proxy runs on the Node runtime).
 *
 * NOTE: no `azp`/authorized-party check. Signature verification already
 * binds the token to this Clerk instance; browser-minted tokens carry an
 * `azp` equal to the app origin (not the Frontend API), so comparing it
 * to the publishable key's frontendApi rejected every real browser
 * session while API-minted test tokens (no azp) passed.
 *
 * Result statuses:
 * - "authenticated": token verified and the user exists in the users table.
 * - "not-synced": token verified, but no user row yet (webhook pending).
 * - "unknown-token": no token, or the token failed verification.
 */
export async function resolveCurrentUser(): Promise<ResolvedSession> {
  const sessionToken = (await cookies()).get("__session")?.value;
  if (!sessionToken) return { status: "unknown-token", user: null };

  let subject: string;
  try {
    const env = getEnv();
    const claims = await verifyToken(sessionToken, {
      secretKey: env.CLERK_SECRET_KEY,
    });
    subject = claims.sub;
  } catch (error) {
    // Expected for expired, malformed or otherwise invalid tokens —
    // treat as unauthenticated, log at debug level.
    console.debug("Clerk session token verification failed:", error);
    return { status: "unknown-token", user: null };
  }

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, subject))
    .limit(1);

  return user
    ? { status: "authenticated", user }
    : { status: "not-synced", user: null };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { user } = await resolveCurrentUser();
  return user;
}
