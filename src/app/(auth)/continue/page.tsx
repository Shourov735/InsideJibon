import { redirect } from "next/navigation";

import { resolveCurrentUser } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";
import { AuthWaitingRoom } from "@/components/auth/auth-waiting-room";

export const metadata = {
  title: "Signing You In",
};

export const dynamic = "force-dynamic";

/**
 * Post-authentication landing target for Clerk's sign-in / sign-up
 * fallback redirects.
 *
 * Fast path: the session is already verifiable server-side → route by
 * role immediately. Otherwise render a client waiting room that polls
 * /api/me — NEVER bounce back to /sign-in, because clerk-js forwards
 * authenticated users straight back here (infinite loop). Unsynced
 * accounts go to the account-pending notice.
 */
export default async function AuthContinuePage() {
  const { status, user } = await resolveCurrentUser();

  if (user) {
    redirect(dashboardPathForRole(user.role));
  }

  if (status === "not-synced") {
    redirect("/account-pending");
  }

  return <AuthWaitingRoom />;
}
