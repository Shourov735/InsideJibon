"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-segment error boundary. Keeps navigation chrome alive when a
 * page throws on the client and offers a retry instead of a blank view.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page render error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <div>
        <h1 className="font-display text-lg font-bold tracking-tight text-on-surface sm:text-xl">
          Something went wrong / কিছু একটা ভুল হয়েছে
        </h1>
        <p className="mt-1 max-w-sm text-sm text-secondary">
          An unexpected error occurred while loading this page. / এই পেজ লোড হওয়ার সময় অপ্রত্যাশিত সমস্যা হয়েছে।
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-outline">Error ID: {error.digest}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container hover:text-on-primary-container"
        >
          Try again / আবার চেষ্টা করুন
        </button>
        <Link href="/" className="text-sm font-semibold text-primary hover:underline">
          Go home / হোমপেজে যান
        </Link>
      </div>
    </main>
  );
}
