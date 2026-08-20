import "server-only";
import { redirect } from "next/navigation";

import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import type { Role } from "@/db/schema";

/**
 * Server-side authorization helpers. Middleware/proxy handles the
 * optimistic redirect; these helpers are the authoritative check and
 * must be called in every protected layout, action and route handler.
 */

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

export const requireStudent = () => requireRole("student");
export const requireTeacher = () => requireRole("teacher");
export const requireAdmin = () => requireRole("admin");