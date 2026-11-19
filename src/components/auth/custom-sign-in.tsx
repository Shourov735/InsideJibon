"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk, useSignIn } from "@clerk/nextjs";
import { useTranslations } from "@/i18n/client";
import { BrandLogo } from "@/components/shared/brand-logo";
import { AuthMonumentSilhouette } from "@/components/auth/auth-monument-silhouette";
import { ArrowRightIcon, MailIcon } from "@/components/shared/ui/icons";

export interface CustomSignInProps {
  continueUrl?: string;
  signUpUrl?: string;
  onClose?: () => void;
  isModal?: boolean;
}

type AuthStep = "email" | "password" | "code" | "reset";

export function CustomSignIn({
  continueUrl = "/continue",
  signUpUrl = "/sign-up",
  onClose,
  isModal = false,
}: CustomSignInProps) {
  const router = useRouter();
  const { t, locale } = useTranslations();
  const isBn = locale === "bn";

  const { signIn } = useSignIn();
  const clerk = useClerk();

  // Form State
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Google Social Sign-In
  async function handleGoogleSignIn() {
    if (!signIn) return;
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const res = await signIn.sso({
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

  // Finalize active session
  async function completeSession(sessionId?: string | null) {
    if (signIn.finalize) {
      await signIn.finalize({
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

  // Step 1: Submit Email Identifier
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage(t("auth.error.invalidEmail"));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await signIn.create({ identifier: email });

      if (res.error) {
        // If account not found or error
        const code = res.error.code || "";
        if (code.includes("not_found")) {
          setErrorMessage(
            isBn
              ? "এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে সাইন আপ করুন।"
              : "No account found with this email. Please sign up."
          );
        } else {
          setErrorMessage(res.error.message || t("auth.error.general"));
        }
        setIsLoading(false);
        return;
      }

      // Check available factors
      const supportedFactors = signIn.supportedFirstFactors || [];
      const hasPassword = supportedFactors.some((f) => f.strategy === "password");
      const hasEmailCode = supportedFactors.some((f) => f.strategy === "email_code");

      if (hasPassword) {
        setStep("password");
      } else if (hasEmailCode) {
        // Automatically send email code
        await signIn.emailCode.sendCode();
        setStep("code");
        setInfoMessage(
          isBn
            ? `আমরা ${email} ঠিকানায় ৬ ডিজিটের একটি কোড পাঠিয়েছি।`
            : `We sent a 6-digit verification code to ${email}.`
        );
      } else {
        setStep("password");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("auth.error.general");
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  // Step 2A: Submit Password
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setErrorMessage(t("auth.error.missingPassword"));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await signIn.password({ password });

      if (res.error) {
        setErrorMessage(
          isBn
            ? "ভুল পাসওয়ার্ড। অনুগ্রহ করে আবার চেষ্টা করুন।"
            : res.error.message || "Invalid password. Please try again."
        );
        setIsLoading(false);
        return;
      }

      if (signIn.status === "complete") {
        await completeSession(signIn.createdSessionId);
      } else if (signIn.status === "needs_first_factor" || signIn.status === "needs_second_factor") {
        setStep("code");
        setInfoMessage(
          isBn
            ? "নিরাপত্তা নিশ্চিত করতে একটি ভেরিফিকেশন কোড প্রয়োজন।"
            : "A verification code is required for security."
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("auth.error.general");
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  // Step 2B: Submit Email Code (OTP)
  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code || code.length < 6) {
      setErrorMessage(t("auth.error.invalidCode"));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await signIn.emailCode.verifyCode({ code });

      if (res.error) {
        setErrorMessage(res.error.message || t("auth.error.invalidCode"));
        setIsLoading(false);
        return;
      }

      if (signIn.status === "complete") {
        await completeSession(signIn.createdSessionId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("auth.error.general");
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  // Forgot Password: Request Reset Code
  async function handleForgotPassword() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await signIn.resetPasswordEmailCode.sendCode();
      if (res.error) {
        setErrorMessage(res.error.message || t("auth.error.general"));
      } else {
        setStep("reset");
        setInfoMessage(
          isBn
            ? `আমরা আপনার ইমেইলে পাসওয়ার্ড রিসেট কোড পাঠিয়েছি।`
            : `We sent a password reset code to ${email}.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("auth.error.general");
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  // Reset Password Submission
  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !newPassword) {
      setErrorMessage(t("auth.error.missingPassword"));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const verifyRes = await signIn.resetPasswordEmailCode.verifyCode({ code });
      if (verifyRes.error) {
        setErrorMessage(verifyRes.error.message || t("auth.error.invalidCode"));
        setIsLoading(false);
        return;
      }

      const submitRes = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
      });

      if (submitRes.error) {
        setErrorMessage(submitRes.error.message || t("auth.error.general"));
        setIsLoading(false);
        return;
      }

      if (signIn.status === "complete") {
        await completeSession(signIn.createdSessionId);
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
        className="pointer-events-none absolute -top-20 -left-20 h-44 w-44 rounded-full bg-blue-400/10 blur-2xl"
      />

      {/* Close button if modal */}
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Brand Header */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <BrandLogo href="/" size="md" variant="full" />
        <div className="mt-1 font-mono text-[11px] tracking-widest text-slate-400 uppercase">
          Learn · Practice · Grow
        </div>

        {/* Heading & Subtitle */}
        <h1 className="mt-5 font-serif text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {t("auth.welcomeBack") || "Welcome back!"}
        </h1>
        <p className="mt-1.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
          {t("auth.welcomeSubtitle") || "Sign in to continue your learning journey"}
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
          onClick={handleGoogleSignIn}
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
          <span>{t("auth.continueWithGoogle") || "Continue with Google"}</span>
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

      {/* Multi-Step Email Flow */}
      <div className="relative z-10">
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="sign-in-email"
                className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {t("auth.emailLabel") || "Email address"}
              </label>

              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 text-slate-400">
                  <MailIcon size={18} />
                </span>
                <input
                  id="sign-in-email"
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

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0B2545] px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-[#133A6B] active:scale-[0.99] disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>{t("auth.continue") || "Continue"}</span>
                  <ArrowRightIcon size={15} />
                </>
              )}
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-500 truncate max-w-[200px]">
                  {email}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setPassword("");
                    setErrorMessage(null);
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                >
                  {isBn ? "ইমেইল পরিবর্তন" : "Change"}
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  id="sign-in-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoFocus
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder") || "Enter your password"}
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                {t("auth.forgotPassword") || "Forgot password?"}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0B2545] px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-[#133A6B] active:scale-[0.99] disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span>{t("auth.signIn") || "Sign In"}</span>
              )}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleCodeSubmit} className="space-y-4 animate-in fade-in duration-200">
            <div>
              <label
                htmlFor="sign-in-code"
                className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {t("auth.codeLabel") || "Verification Code"}
              </label>

              <input
                id="sign-in-code"
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
                <span>{isBn ? "যাচাই করুন ও সাইন ইন" : "Verify & Sign In"}</span>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => signIn.emailCode.sendCode()}
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                {t("auth.resendCode") || "Resend Code"}
              </button>
            </div>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetSubmit} className="space-y-4 animate-in fade-in duration-200">
            <div>
              <label
                htmlFor="reset-code"
                className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {t("auth.codeLabel") || "Verification Code"}
              </label>
              <input
                id="reset-code"
                type="text"
                required
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
                placeholder="6-digit reset code"
                className="h-12 w-full text-center font-mono text-base tracking-widest rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 shadow-2xs outline-hidden transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {isBn ? "নতুন পাসওয়ার্ড" : "New Password"}
              </label>
              <input
                id="new-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-2xs outline-hidden transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                <span>{isBn ? "পাসওয়ার্ড পরিবর্তন করুন" : "Set New Password & Sign In"}</span>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="relative z-10 mt-7 text-center text-xs text-slate-500 sm:text-sm dark:text-slate-400">
        <span>{t("auth.noAccount") || "Don't have an account?"}</span>{" "}
        <Link
          href={signUpUrl}
          className="font-bold text-blue-600 transition-colors hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
        >
          {t("auth.signUp") || "Sign up"}
        </Link>
      </div>

      {/* Spacing for bottom architectural backdrop */}
      <div className="h-12 sm:h-14" />

      {/* Architectural Backdrop at Bottom of Card */}
      <AuthMonumentSilhouette className="absolute bottom-0 left-0 right-0 h-24 sm:h-28" />
    </div>
  );
}
