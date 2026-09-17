import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

import { getCurrentUser } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";

export const metadata = {
  title: "Sign In",
};

interface SignInPageProps {
  searchParams: Promise<{ redirect_url?: string }>;
}

function getSafeRedirect(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("://")) {
    return url;
  }
  return null;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const safeRedirect = getSafeRedirect(params.redirect_url);

  // Already signed in? Skip the form and go straight to target or workspace.
  const user = await getCurrentUser();
  if (user) {
    if (user.role === "student" && safeRedirect) {
      redirect(safeRedirect);
    }
    redirect(dashboardPathForRole(user.role));
  }

  const continueUrl = safeRedirect
    ? `/continue?redirect_url=${encodeURIComponent(safeRedirect)}`
    : "/continue";
  const signUpUrl = safeRedirect
    ? `/sign-up?redirect_url=${encodeURIComponent(safeRedirect)}`
    : "/sign-up";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4">
      {/* Explicit routing props remove any path-inference ambiguity on
          Workers deployments (a misinferred path crashes clerk-js). */}
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl={signUpUrl}
        fallbackRedirectUrl={continueUrl}
      />
    </div>
  );
}
