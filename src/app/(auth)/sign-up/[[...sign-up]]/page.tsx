import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";

import { BrandLogo } from "@/components/shared/brand-logo";
import { getCurrentUser } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/dashboard";
import { getTranslator } from "@/i18n/server";

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
  const t = await getTranslator();

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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-4 py-10">
      <div className="mb-6">
        <BrandLogo href="/" size="md" variant="full" />
      </div>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl={signInUrl}
        fallbackRedirectUrl={continueUrl}
      />
      {/* R10 — legal notice under the Clerk widget.
          Acceptance is recorded server-side on /continue after auth so
          the audit row lands the moment the user has a real session. */}
      <p className="mt-6 max-w-md text-center text-xs text-on-surface-variant">
        {t.locale === "bn" ? (
          <>
            অ্যাকাউন্ট তৈরি করার মাধ্যমে আপনি আমাদের{" "}
            <Link className="underline hover:text-primary" href="/legal/terms">
              {t("legal.footerTerms")}
            </Link>{" "}
            এবং{" "}
            <Link className="underline hover:text-primary" href="/legal/privacy">
              {t("legal.footerPrivacy")}
            </Link>{" "}
            মেনে নিচ্ছেন।
          </>
        ) : (
          <>
            By creating an account, you agree to our{" "}
            <Link className="underline hover:text-primary" href="/legal/terms">
              {t("legal.footerTerms")}
            </Link>{" "}
            and{" "}
            <Link className="underline hover:text-primary" href="/legal/privacy">
              {t("legal.footerPrivacy")}
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
