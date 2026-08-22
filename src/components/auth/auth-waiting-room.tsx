"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@clerk/nextjs";

type Phase = "waiting" | "timeout";

const POLL_INTERVAL_MS = 700;
const MAX_POLLS = 20;

/**
 * Post-authentication waiting room. Right after sign-in the fresh
 * __session cookie may not be visible to the server yet; bouncing to
 * /sign-in here lets clerk-js bounce back — an infinite loop. Instead
 * poll /api/me until the session resolves (or time out with manual
 * links), then route by role.
 */
export function AuthWaitingRoom() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [phase, setPhase] = useState<Phase>("waiting");
  const polls = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = () => {
      if (cancelled) return;
      polls.current += 1;

      fetch("/api/me", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled) return;
          if (data?.authenticated && data?.role) {
            router.replace(
              data.role === "admin"
                ? "/admin"
                : data.role === "teacher"
                  ? "/teacher"
                  : "/student"
            );
            return;
          }
          if (data?.authenticated) {
            router.replace("/account-pending");
            return;
          }
          // Clerk reports a session but the server cannot see it yet —
          // keep waiting for the cookie/token refresh to settle.
          if (polls.current < MAX_POLLS) {
            timer = setTimeout(poll, POLL_INTERVAL_MS);
          } else {
            setPhase("timeout");
          }
        })
        .catch(() => {
          if (!cancelled && polls.current < MAX_POLLS) {
            timer = setTimeout(poll, POLL_INTERVAL_MS);
          } else if (!cancelled) {
            setPhase("timeout");
          }
        });
    };

    // Give clerk-js one beat to finish any post-auth token refresh.
    timer = setTimeout(poll, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface px-4 text-center">
      {phase === "waiting" ? (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-secondary">
            Signing you in… / সাইন-ইন করা হচ্ছে…
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display text-lg font-bold text-on-surface">
            Still working on it… / এখনো প্রক্রিয়াকরণ চলছে…
          </h1>
          <p className="max-w-sm text-sm text-secondary">
            We could not confirm your session automatically.{" "}
            {isLoaded && isSignedIn
              ? "Try opening your dashboard again."
              : "Please sign in again."}{" "}
            / সেশন নিশ্চিত করা যায়নি। আবার চেষ্টা করুন।
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setPhase("waiting");
                polls.current = 0;
                router.refresh();
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container"
            >
              Try again / আবার চেষ্টা করুন
            </button>
            <Link href="/" className="text-sm font-semibold text-primary hover:underline">
              Go home / হোমপেজে যান
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
