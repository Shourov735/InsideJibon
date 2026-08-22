import type { PendingRequestRow } from "@/services/enrollments";
import { RequestDecisionButtons } from "@/components/shared/request-decision-buttons";
import { getTranslator } from "@/i18n/server";

/**
 * Server-rendered list of pending enrollment requests with decision
 * controls. Shared by the teacher course overview and admin dashboard.
 */
export async function PendingRequestsList({
  requests,
}: {
  requests: PendingRequestRow[];
}) {
  const t = await getTranslator();

  if (requests.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-4 py-6 text-center text-sm text-secondary">
        {t("enrollment.requests.empty")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
      {requests.map(({ enrollment, studentName, studentEmail, courseTitle }) => (
        <li
          key={enrollment.id}
          className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-on-surface">
              {studentName || studentEmail}
              <span className="ml-2 font-normal text-secondary">{studentEmail}</span>
            </p>
            <p className="truncate text-xs text-secondary">
              {courseTitle} ·{" "}
              <span className="font-mono">
                {new Intl.DateTimeFormat(t.locale === "bn" ? "bn-BD" : "en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(enrollment.enrolledAt))}
              </span>
            </p>
          </div>
          <RequestDecisionButtons enrollmentId={enrollment.id} />
        </li>
      ))}
    </ul>
  );
}
