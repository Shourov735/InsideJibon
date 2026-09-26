import "server-only";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getEnv } from "@/lib/env";

export type CurrentUser = typeof users.$inferSelect;

export type ResolvedSession =
  | { status: "authenticated"; user: CurrentUser }
  | { status: "unknown-token"; user: null }
  | { status: "not-synced"; user: null };


/**
 * Automatically provisions a user row into PostgreSQL when a verified Clerk session
 * exists but the webhook hasn't landed yet. New users are assigned the 'student' role
 * by default (unless Clerk publicMetadata has an explicit role or this is the first user).
 */
async function autoProvisionUser(
  userId: string,
  secretKey: string
): Promise<CurrentUser | null> {
  try {
    const clerk = createClerkClient({ secretKey });
    const clerkUser = await clerk.users.getUser(userId);
    if (!clerkUser) return null;

    const email =
      clerkUser.emailAddresses?.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ??
      clerkUser.emailAddresses?.[0]?.emailAddress;

    if (!email) {
      console.warn("Auto-provision skipped: no email found for Clerk user", userId);
      return null;
    }

    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      null;
    const imageUrl = clerkUser.imageUrl || null;

    // Check if role is specified in Clerk metadata, else default to 'student'
    const metadataRole = clerkUser.publicMetadata?.role as
      | "student"
      | "teacher"
      | "admin"
      | "parent"
      | undefined;

    const validRoles = ["student", "teacher", "admin", "parent"] as const;
    let assignedRole: "student" | "teacher" | "admin" | "parent" = "student";

    const db = getDb();
    if (metadataRole && validRoles.includes(metadataRole)) {
      assignedRole = metadataRole;
    } else {
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      if (Number(countResult?.count ?? 0) === 0) {
        assignedRole = "admin";
      } else {
        assignedRole = "student";
      }

      // Sync role back to Clerk's publicMetadata asynchronously (fire-and-forget)
      clerk.users
        .updateUserMetadata(userId, {
          publicMetadata: { role: assignedRole },
        })
        .catch((err) => {
          console.warn("Failed to sync role to Clerk publicMetadata:", err);
        });
    }

    // Check if another row already has this email
    const [existingByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingByEmail) {
      if (existingByEmail.id === userId) {
        return existingByEmail;
      }
      try {
        const [updated] = await db
          .update(users)
          .set({
            id: userId,
            name: name ?? existingByEmail.name,
            imageUrl: imageUrl ?? existingByEmail.imageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.email, email))
          .returning();
        if (updated) return updated;
      } catch {
        await db
          .update(users)
          .set({ email: `${existingByEmail.email}.archived.${Date.now()}` })
          .where(eq(users.id, existingByEmail.id));
      }
    }

    const [insertedUser] = await db
      .insert(users)
      .values({
        id: userId,
        email,
        name,
        imageUrl,
        role: assignedRole,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email,
          name: sql`COALESCE(EXCLUDED.name, ${users.name})`,
          imageUrl: sql`COALESCE(EXCLUDED.image_url, ${users.imageUrl})`,
          updatedAt: new Date(),
        },
      })
      .returning();

    return insertedUser ?? null;
  } catch (err) {
    console.error("Auto-provisioning user from Clerk failed:", err);
    return null;
  }
}

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
 * - "not-synced": token verified, but no user row yet (auto-provisioning failed).
 * - "unknown-token": no token, or the token failed verification.
 */
async function resolveCurrentUserImpl(): Promise<ResolvedSession> {
  const sessionToken = (await cookies()).get("__session")?.value;
  if (!sessionToken) return { status: "unknown-token", user: null };

  let subject: string;
  const env = getEnv();
  try {
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
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, subject))
    .limit(1);

  let user: CurrentUser | null = rows[0] ?? null;

  if (!user) {
    user = await autoProvisionUser(subject, env.CLERK_SECRET_KEY);
  }

  return user
    ? { status: "authenticated", user }
    : { status: "not-synced", user: null };
}

/**
 * Memoized per request: layouts, pages, generateMetadata and server actions
 * all call this repeatedly; the token is verified and the user row fetched
 * only once per invocation instead of on every call.
 */
export const resolveCurrentUser = cache(resolveCurrentUserImpl);

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { user } = await resolveCurrentUser();
  return user;
}
