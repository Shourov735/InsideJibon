"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk, useSignUp } from "@clerk/nextjs";
import { useTranslations } from "@/i18n/client";
import { BrandLogo } from "@/components/shared/brand-logo";
import { AuthMonumentSilhouette } from "@/components/auth/auth-monument-silhouette";
import { ArrowRightIcon, MailIcon } from "@/components/shared/ui/icons";

export interface CustomSignUpProps {
  continueUrl?: string;
  signInUrl?: string;
}

export function CustomSignUp({
  continueUrl = "/continue",
  signInUrl = "/sign-in",
}: CustomSignUpProps) {
  const router = useRouter();
  const { t, locale } = useTranslations();
  const isBn = locale === "bn";

  const { signUp } = useSignUp();
  const clerk = useClerk();

  // Form State
  const [step, setStep] = useState<"form" | "code">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Loading & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Google Social Sign-Up
  async function handleGoogleSignUp() {
    if (!signUp) return;
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const res = await signUp.sso({
        strategy: "oauth_google",
        redirectUrl: continueUrl,
        redirectCallbackUrl: "/sso-callback",
      });
      if (res?.error) {
        setIsGoogleLoading(false);
        setErrorMessage(res.error.message || t("auth.error.general"));
      }
    } catch (err: unknown) {
      setIsGoogleLoading(false);
      const msg = err instanceof Error ? err.message : t("auth.error.general");
      setErrorMessage(msg);
    }
  }

  // Finalize session
  async function completeSession(sessionId?: string | null) {
    if (signUp.finalize) {
      await signUp.finalize({
        navigate: async ({ decorateUrl }) => {
          const url = decorateUrl(continueUrl);
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });
      return;
    }

    if (sessionId) {
      await clerk.setActive({ session: sessionId });
    }
    router.push(continueUrl);
  }

  // Step 1: Submit email & password
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage(t("auth.error.invalidEmail"));
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage(
        isBn
          ? "পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।"
          : "Password must be at least 8 characters long."
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      let res;
      if (signUp.password) {
        res = await signUp.password({
          emailAddress: email,
          password,
        });
      } else {
        res = await signUp.create({
          emailAddress: email,
          password,
        });
      }

      if (res?.error) {
        setErrorMessage(res.error.message || t("auth.error.general"));
        setIsLoading(false);
        return;
      }

      // Send verification code
      if (signUp.verifications?.sendEmailCode) {
        const sendRes = await signUp.verifications.sendEmailCode();
        if (sendRes?.error) {
          setErrorMessage(sendRes.error.message || t("auth.error.general"));
          setIsLoading(false);
          return;
        }
      }

      setStep("code");
      setInfoMessage(
        isBn
          ? `আমরা ${email} ঠিকানায় ৬ ডিজিটের একটি কোড পাঠিয়েছি।`
          : `We sent a 6-digit verification code to ${email}.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("auth.error.general");
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  // Step 2: Verify code
  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code || code.length < 6) {
      setErrorMessage(t("auth.error.invalidCode"));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      let verifyRes;
      if (signUp.verifications?.verifyEmailCode) {
        verifyRes = await signUp.verifications.verifyEmailCode({ code });
      }

      if (verifyRes?.error) {
        setErrorMessage(verifyRes.error.message || t("auth.error.invalidCode"));
        setIsLoading(false);
        return;
      }

      if (signUp.status === "complete") {
        await completeSession(signUp.createdSessionId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("auth.error.general");
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-[440px] overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-[0_25px_60px_rgba(0,35,70,0.12)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900">
      
      {/* Top Subtle Organic Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-20 h-44 w-44 rounded-full bg-emerald-400/10 blur-2xl"
      />

      {/* Brand Header */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <BrandLogo href="/" size="md" variant="full" />
        <div className="mt-1 font-mono text-[11px] tracking-widest text-slate-400 uppercase">
          Learn · Practice · Grow
        </div>

        {/* Heading & Subtitle */}
        <h1 className="mt-5 font-serif text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {t("auth.createAccountTitle") || "Create your account"}
        </h1>
        <p className="mt-1.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
          {t("auth.createAccountSubtitle") || "Join InsideJibon to start learning"}
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="relative z-10 mt-5 rounded-2xl border border-red-200 bg-red-50/90 p-3 text-xs text-red-700 shadow-2xs dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-center gap-2">
            <span className="font-bold text-red-600">✕</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Info Alert */}
      {infoMessage && (
        <div className="relative z-10 mt-5 rounded-2xl border border-blue-200 bg-blue-50/90 p-3 text-xs text-blue-700 shadow-2xs dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <span>ℹ</span>
            <span>{infoMessage}</span>
          </div>
        </div>
      )}

      {/* Google Social Action */}
      <div className="relative z-10 mt-6">
        <button
          type="button"
          disabled={isGoogleLoading || isLoading}
          onClick={handleGoogleSignUp}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-750"
        >
          {isGoogleLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" />
          ) : (
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          )}
          <span>{isBn ? "Google দিয়ে সাইন আপ করুন" : "Continue with Google"}</span>
        </button>
      </div>

      {/* Divider */}
      <div className="relative z-10 my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {t("auth.or") || "or"}
        </span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Multi-Step Flow */}
      <div className="relative z-10">
        {step === "form" && (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="sign-up-email"
                className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {t("auth.emailLabel") || "Email address"}
              </label>

              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 text-slate-400">
                  <MailIcon size={18} />
                </span>
                <input
                  id="sign-up-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder") || "Enter your email address"}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-2xs outline-hidden transition-all placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="sign-up-password"
                className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {t("auth.passwordLabel") || "Password"}
              </label>

              <div className="relative flex items-center">
                <input
                  id="sign-up-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isBn ? "পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)" : "At least 8 characters"}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-11 text-sm text-slate-900 shadow-2xs outline-hidden transition-all placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0B2545] px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-[#133A6B] active:scale-[0.99] disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>{isBn ? "অ্যাকাউন্ট তৈরি করুন" : "Create Account"}</span>
                  <ArrowRightIcon size={15} />
                </>
              )}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleCodeSubmit} className="space-y-4 animate-in fade-in duration-200">
            <div>
              <label
                htmlFor="sign-up-code"
                className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {t("auth.codeLabel") || "Verification Code"}
              </label>

              <input
                id="sign-up-code"
                type="text"
                required
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
                placeholder={t("auth.codePlaceholder") || "Enter 6-digit code"}
                className="h-12 w-full text-center font-mono text-lg tracking-widest rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 shadow-2xs outline-hidden transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0B2545] px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-[#133A6B] active:scale-[0.99] disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span>{isBn ? "যাচাই করুন ও সম্পন্ন করুন" : "Verify & Complete"}</span>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => signUp.verifications?.sendEmailCode?.()}
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                {t("auth.resendCode") || "Resend Code"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="relative z-10 mt-7 text-center text-xs text-slate-500 sm:text-sm dark:text-slate-400">
        <span>{t("auth.haveAccount") || "Already have an account?"}</span>{" "}
        <Link
          href={signInUrl}
          className="font-bold text-blue-600 transition-colors hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
        >
          {t("auth.signIn") || "Sign in"}
        </Link>
      </div>

      {/* R10 Legal Terms Notice */}
      <p className="relative z-10 mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
        {isBn ? (
          <>
            অ্যাকাউন্ট তৈরি করার মাধ্যমে আপনি আমাদের{" "}
            <Link className="underline hover:text-blue-600" href="/legal/terms">
              শর্তাবলী
            </Link>{" "}
            ও{" "}
            <Link className="underline hover:text-blue-600" href="/legal/privacy">
              গোপনীয়তা নীতি
            </Link>{" "}
            মেনে নিচ্ছেন।
          </>
        ) : (
          <>
            By creating an account, you agree to our{" "}
            <Link className="underline hover:text-blue-600" href="/legal/terms">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link className="underline hover:text-blue-600" href="/legal/privacy">
              Privacy Policy
            </Link>
            .
          </>
        )}
      </p>

      {/* Spacing for bottom architectural backdrop */}
      <div className="h-10 sm:h-12" />

      {/* Architectural Backdrop at Bottom of Card */}
      <AuthMonumentSilhouette className="absolute bottom-0 left-0 right-0 h-24 sm:h-28" />
    </div>
  );
}
