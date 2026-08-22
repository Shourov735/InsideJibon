import { redirect } from "next/navigation";

import { resolveCurrentUser } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";

export const metadata = {
  title: "Signing You In",
};

export const dynamic = "force-dynamic";

/**
 * Post-authentication landing target for Clerk's sign-in / sign-up
 * fallback redirects. Routes each verified role to its own workspace;
 * unsynced users fall through to the account-pending notice; anonymous
 * visitors are sent back to the sign-in page.
 */
export default async function AuthContinuePage() {
  const { status, user } = await resolveCurrentUser();

  if (user) {
    redirect(dashboardPathForRole(user.role));
  }

  if (status === "not-synced") {
    redirect("/account-pending");
  }

  redirect("/sign-in");
}
