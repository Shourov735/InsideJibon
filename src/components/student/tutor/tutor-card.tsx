import Link from "next/link";

import { getTranslator } from "@/i18n/server";

/**
 * R8 §4.3 — Student dashboard "Ask the tutor" card.
 *
 * Server component — links to the last watched lesson's tutor sheet. The
 * tutor side sheet itself lives on the lesson page; this card is the
 * dashboard-level entry point per the R8 contract.
 */
interface TutorDashboardCardProps {
  courseId: string | null;
  lessonId: string | null;
}

export async function TutorDashboardCard({
  courseId,
  lessonId,
}: TutorDashboardCardProps) {
  const t = await getTranslator();
  if (!courseId || !lessonId) return null;
  const href = `/student/courses/${courseId}/learn?lesson=${lessonId}&tutor=1`;
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-emerald-900">
            {t("tutor.dashboardCard.title")}
          </h2>
          <p className="mt-1 text-sm text-emerald-800">
            {t("tutor.dashboardCard.body")}
          </p>
        </div>
        <svg
          className="h-7 w-7 shrink-0 text-emerald-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707M12 21a7 7 0 01-7-7c0-2.5 1.5-4 4-4h6c2.5 0 4 1.5 4 4a7 7 0 01-7 7z"
          />
        </svg>
      </div>
      <Link
        href={href}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-800"
      >
        {t("tutor.dashboardCard.cta")}
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </section>
  );
}