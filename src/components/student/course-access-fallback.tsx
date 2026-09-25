import Link from "next/link";
import { getTranslator } from "@/i18n/server";

export async function CourseAccessFallback({
  scopeKind,
  scopeId,
}: {
  scopeKind: string;
  scopeId: string;
}) {
  const t = await getTranslator();
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xs">
      <h1 className="text-xl font-bold tracking-tight text-on-surface">
        {t("payment.fallback.unavailable")}
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        {t("payment.subtitle")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={
            scopeKind === "course"
              ? `/courses/${scopeId}`
              : `/bundles/${scopeId}`
          }
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90"
        >
          {t("common.backToCourses")}
        </Link>
        <Link
          href="/courses"
          className="inline-flex items-center rounded-md border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
        >
          {t("payment.actions.requestAccess")}
        </Link>
      </div>
    </div>
  );
}