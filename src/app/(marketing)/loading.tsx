import React from "react";
import { Container } from "@/components/shared/ui/container";

export default function MarketingLoading() {
  return (
    <div className="w-full min-h-screen bg-[#FAF8F5] dark:bg-[#0B0B0E] transition-colors" aria-busy="true">
      <span className="sr-only">Loading page content... / পেজের তথ্য লোড হচ্ছে...</span>

      {/* Hero Skeleton */}
      <section className="pt-10 pb-20 sm:pt-16 sm:pb-32">
        <Container size="xl">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
            {/* Left Column Skeleton */}
            <div className="flex flex-col items-start lg:col-span-7 space-y-5 animate-pulse">
              <div className="h-6 w-48 rounded-full bg-surface-2 dark:bg-surface-3" />
              <div className="h-14 sm:h-20 w-3/4 rounded-2xl bg-surface-2 dark:bg-surface-3" />
              <div className="h-8 w-40 rounded-xl bg-surface-2 dark:bg-surface-3" />
              <div className="h-16 w-full max-w-lg rounded-xl bg-surface-2 dark:bg-surface-3" />
              <div className="flex gap-4 pt-2">
                <div className="h-12 w-36 rounded-full bg-blue-600/30" />
                <div className="h-12 w-36 rounded-full bg-surface-2 dark:bg-surface-3" />
              </div>
            </div>

            {/* Right Column (Dashboard Card) Skeleton */}
            <div className="lg:col-span-5 animate-pulse">
              <div className="h-80 sm:h-96 w-full rounded-3xl border border-outline-variant/60 bg-white/70 p-5 shadow-sm dark:bg-surface-1/70" />
            </div>
          </div>
        </Container>
      </section>

      {/* Value Pillars Strip Skeleton */}
      <div className="relative -mt-10 sm:-mt-14 mb-12 sm:mb-20">
        <Container size="xl">
          <div className="h-28 w-full rounded-3xl border border-outline-variant/60 bg-white/70 shadow-sm dark:bg-surface-1/70 animate-pulse" />
        </Container>
      </div>

      {/* Subject Grid Skeleton */}
      <section className="py-12">
        <Container size="xl">
          <div className="mx-auto flex flex-col items-center space-y-3 animate-pulse">
            <div className="h-6 w-32 rounded-full bg-surface-2 dark:bg-surface-3" />
            <div className="h-10 w-64 rounded-xl bg-surface-2 dark:bg-surface-3" />
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface-2/60 dark:bg-surface-2/40" />
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
