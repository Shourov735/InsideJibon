import Link from "next/link";

import { requireUser } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import { EmptyState } from "@/components/shared/feedback";

export const metadata = {
  title: "Parent Panel | InsideJibon",
  description:
    "A dedicated space for parents to track their child's learning progress — coming soon.",
};

// Public roadmap anchor for placeholder CTAs. Phase R7 will replace
// these placeholders with the real parent experience.
const ROADMAP_URL = "https://github.com/insidejibon/insidejibon#roadmap";

export default async function ParentPlaceholderPage() {
  // Parent role does not exist yet in the DB schema (roleEnum is
  // student/teacher/admin only). We require *some* signed-in user
  // so anonymous visitors are still bounced to sign-in, but we don't
  // gate by role — R7 will introduce the `parent` role and tighten
  // this gate to `requireRole("parent")`.
  await requireUser();
  const t = await getTranslator();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-container px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-primary-container">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {t("nav.parent")}
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {t("dashboard.parent.placeholder.title")}
          </h1>
        </div>

        <EmptyState
          icon={
            <svg
              className="h-6 w-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8 4 4 0 000 8z"
              />
            </svg>
          }
          title={t("dashboard.parent.placeholder.title")}
          description={t("dashboard.parent.placeholder.description")}
          action={
            <Link
              href={ROADMAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-2xs hover:bg-primary-container hover:text-on-primary-container transition-colors"
            >
              {t("dashboard.parent.placeholder.cta")} →
            </Link>
          }
        />
      </div>
    </main>
  );
}
