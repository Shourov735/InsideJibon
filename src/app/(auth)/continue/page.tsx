import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { resolveCurrentUser } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";
import { AuthWaitingRoom } from "@/components/auth/auth-waiting-room";
import { autoAcceptCurrentDocs } from "@/services/legal/auto-accept";

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
 *
 * R10 — once the user is authenticated we record legal acceptances
 * (idempotent) for the current terms + privacy versions, then redirect
 * to the role dashboard.
 */
interface AuthContinuePageProps {
  searchParams: Promise<{ redirect_url?: string }>;
}

function getSafeRedirect(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("://")) {
    return url;
  }
  return null;
}

export default async function AuthContinuePage({ searchParams }: AuthContinuePageProps) {
  const params = await searchParams;
  const safeRedirect = getSafeRedirect(params.redirect_url);
  const { status, user } = await resolveCurrentUser();

  if (user) {
    // R10 — best-effort legal acceptance audit.
    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for") ?? null;
      userAgent = h.get("user-agent") ?? null;
    } catch {
      // headers() not available in some runtime contexts — keep nulls.
    }
    await autoAcceptCurrentDocs({ ip, userAgent });

    if (user.role === "student" && safeRedirect) {
      redirect(safeRedirect);
    }
    redirect(dashboardPathForRole(user.role));
  }

  if (status === "not-synced") {
    redirect("/account-pending");
  }

  return <AuthWaitingRoom redirectUrl={safeRedirect ?? undefined} />;
}
