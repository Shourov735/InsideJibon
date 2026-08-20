import "server-only";
import { verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getEnv } from "@/lib/env";

export type CurrentUser = typeof users.$inferSelect;

/**
 * Returns the application user for the authenticated Clerk session,
 * or null when unauthenticated or not yet synced into the users table.
 *
 * The Clerk session token (__session cookie) is verified against the
 * Clerk instance's JWKS before any user ID is trusted — never trust
 * client-provided IDs. Token verification is done manually because
 * Clerk's middleware (which normally provides auth context) cannot run
 * on Cloudflare Workers (Next.js 16 proxy runs on the Node runtime).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const sessionToken = (await cookies()).get("__session")?.value;
  if (!sessionToken) return null;

  let subject: string;
  try {
    const claims = await verifyToken(sessionToken, {
      secretKey: getEnv().CLERK_SECRET_KEY,
    });
    subject = claims.sub;
  } catch (error) {
    console.error("Clerk session token verification failed:", error);
    return null;
  }

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, subject))
    .limit(1);

  return user ?? null;
}