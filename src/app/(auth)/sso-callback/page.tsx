import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { BrandLogo } from "@/components/shared/brand-logo";

export const metadata = {
  title: "Authenticating | InsideJibon",
};

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#FAF8F5] px-4 py-12 dark:bg-[#0B0B0E]">
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandLogo href="/" size="md" variant="full" />

        <div className="mt-4 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        </div>

        <p className="font-display text-sm font-semibold text-slate-700 dark:text-slate-300">
          সাইন ইন সম্পন্ন হচ্ছে...
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Completing your authentication, please wait a moment.
        </p>
      </div>

      {/* Headless Clerk redirect callback handler */}
      <AuthenticateWithRedirectCallback
        continueSignUpUrl="/sign-up"
        signInFallbackRedirectUrl="/continue"
        signUpFallbackRedirectUrl="/continue"
      />
    </div>
  );
}
