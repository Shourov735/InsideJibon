"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/shared/ui/container";

interface MarketingErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MarketingError({ error, reset }: MarketingErrorProps) {
  useEffect(() => {
    console.error("[MarketingError] Unhandled error in marketing segment:", error);
  }, [error]);

  return (
    <main
      id="main-content"
      role="alert"
      className="flex min-h-[65dvh] items-center justify-center py-16 px-4 text-center bg-[#FAF8F5] dark:bg-[#0B0B0E]"
    >
      <Container size="sm">
        <div className="rounded-3xl border border-outline-variant/70 bg-white/95 p-8 sm:p-10 shadow-academic dark:bg-surface-1">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          <h1 className="mt-5 font-serif text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            পৃষ্ঠাটি প্রদর্শনে সমস্যা হয়েছে / Something Went Wrong
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-ink-500 sm:text-base dark:text-ink-400">
            সংযোগ বা সার্ভারের কোনো সাময়িক জটিলতার কারণে পেজটি লোড করা সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।
          </p>

          {error.digest ? (
            <p className="mt-2 font-mono text-xs text-ink-400">Reference ID: {error.digest}</p>
          ) : null}

          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              পুনরায় চেষ্টা করুন / Try Again
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-full border border-outline-variant bg-surface-0 px-6 text-sm font-semibold text-ink-900 hover:bg-surface-2 transition-colors dark:bg-surface-2 dark:text-ink-100"
            >
              হোমে ফিরে যান / Back to Home
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
