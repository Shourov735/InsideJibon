import { requireUser } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import {
  listActiveNumbers,
  resolveScopePrice,
  hasRecentSubmissionForScope,
} from "@/services/payments";
import { CheckoutForm } from "@/components/student/checkout-form";
import { formatBDT } from "@/lib/utils";
import { isUuid } from "@/lib/utils";
import { CourseAccessFallback } from "@/components/student/course-access-fallback";
import { resolveCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Checkout | InsideJibon",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ scopeKind: string; scopeId: string }>;
}) {
  const { scopeKind, scopeId } = await params;
  const { status, user } = await resolveCurrentUser();
  if (status === "not-synced") {
    return (
      <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-10">
        <p className="text-on-surface">Account syncing…</p>
      </main>
    );
  }
  if (!user) {
    return (
      <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-10">
        <p className="text-on-surface">Please sign in to continue.</p>
      </main>
    );
  }
  if (user.role !== "student") {
    return (
      <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-10">
        <p className="text-on-surface">Only students can pay.</p>
      </main>
    );
  }
  if (scopeKind !== "course" && scopeKind !== "bundle") {
    return (
      <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-10">
        <p className="text-on-surface">Invalid scope.</p>
      </main>
    );
  }
  if (!isUuid(scopeId)) {
    return (
      <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-10">
        <p className="text-on-surface">Invalid identifier.</p>
      </main>
    );
  }

  // Pre-authorize via requireUser so the page is protected.
  await requireUser();

  const t = await getTranslator();

  const scope = await resolveScopePrice({
    scopeKind,
    scopeId,
  });

  if (!scope) {
    return (
      <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-10">
        <CourseAccessFallback scopeKind={scopeKind} scopeId={scopeId} />
      </main>
    );
  }

  const [numbers, hasRecent] = await Promise.all([
    listActiveNumbers(),
    hasRecentSubmissionForScope({
      userId: user.id,
      scopeKind,
      scopeId,
    }),
  ]);

  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-on-surface">
        {t("payment.title")}
      </h1>
      <p className="mt-1 text-sm text-on-surface-variant">
        {t("payment.subtitle")}
      </p>

      <CheckoutForm
        scopeKind={scopeKind}
        scopeId={scopeId}
        scopeTitle={scope.title}
        amountBdt={scope.priceBdt}
        numbers={numbers.map((n) => ({
          id: n.id,
          label: n.label,
          bkashNumber: n.bkashNumber,
          holderName: n.holderName,
          instructions: n.instructions,
          whatsappNumber: n.whatsappNumber,
          whatsappTemplate: n.whatsappTemplate,
        }))}
        hasRecentSubmission={hasRecent}
      />

      <p className="mt-6 text-center text-xs text-on-surface-variant">
        {formatBDT(scope.priceBdt)}
      </p>
    </main>
  );
}