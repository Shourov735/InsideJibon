import "server-only";
import { verifyToken } from "@clerk/backend";
import { parsePublishableKey } from "@clerk/shared/keys";
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

    // Authorized-party check: only enforce when the token carries an azp
    // claim, so tokens minted without one (e.g. backend-context tokens)
    // keep working. The signature check already binds tokens to this
    // Clerk instance; azp adds defense against token reuse elsewhere.
    const parties = getAuthorizedParties();
    if (parties && claims.azp && !parties.includes(claims.azp)) {
      console.warn(
        "Clerk session token rejected: azp claim does not match the publishable key's frontend API.",
      );
      return { status: "unknown-token", user: null };
    }

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

let cachedAuthorizedParties: string[] | null | undefined;

function getAuthorizedParties(): string[] | null {
  if (cachedAuthorizedParties !== undefined) return cachedAuthorizedParties;

  // NEXT_PUBLIC vars are inlined at build time, so this is safe to read
  // even though the worker environment does not carry it as a secret.
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return (cachedAuthorizedParties = null);

  const { frontendApi } = parsePublishableKey(publishableKey) ?? {};
  cachedAuthorizedParties = frontendApi
    ? [`https://${frontendApi}`]
    : null;
  return cachedAuthorizedParties;
}