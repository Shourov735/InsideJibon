import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";

import { getCurrentUser } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";

export const metadata = {
  title: "Sign Up",
};

interface SignUpPageProps {
  searchParams: Promise<{ redirect_url?: string }>;
}

function getSafeRedirect(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("://")) {
    return url;
  }
  return null;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const safeRedirect = getSafeRedirect(params.redirect_url);

  // Already signed in? No need for another account.
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
  const signInUrl = safeRedirect
    ? `/sign-in?redirect_url=${encodeURIComponent(safeRedirect)}`
    : "/sign-in";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl={signInUrl}
        fallbackRedirectUrl={continueUrl}
      />
    </div>
  );
}
