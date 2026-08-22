import "server-only";
import { redirect } from "next/navigation";

import { resolveCurrentUser, type CurrentUser } from "@/lib/auth";
import type { Role } from "@/db/schema";

/**
 * Server-side authorization helpers. Middleware/proxy handles the
 * optimistic redirect; these helpers are the authoritative check and
 * must be called in every protected layout, action and route handler.
 */

export async function requireUser(): Promise<CurrentUser> {
  const { status, user } = await resolveCurrentUser();
  if (user) return user;

  // The session token is valid but the user has not been synced into the
  // users table yet (webhook pending). Send them to an explanatory page
  // instead of the sign-in page or homepage so signed-in users are not
  // bounced into a sign-in loop while the webhook catches up.
  if (status === "not-synced") redirect("/account-pending");

  redirect("/sign-in");
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

export const requireStudent = () => requireRole("student");
export const requireTeacher = () => requireRole("teacher");
export const requireAdmin = () => requireRole("admin");
