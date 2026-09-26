import { requireParent } from "@/lib/permissions";
import { getLinkedStudents } from "@/services/parent/links";
import { getTranslator } from "@/i18n/server";
import { ParentInviteForm } from "@/components/parent/parent-invite-form";
import { ParentLinkList } from "@/components/parent/parent-link-list";
import { rateLimit } from "@/services/security/rate-limit";

export const dynamic = "force-dynamic";

export default async function ParentInvitePage() {
  const user = await requireParent();
  const t = await getTranslator();
  const linked = await getLinkedStudents(user.id);

  // Soft rate-limit check (the action re-enforces via R0 KV bucket).
  // We surface a hint at the top so a misbehaving parent doesn't get
  // a 429 surprise mid-form.
  const decision = await rateLimit("parent.invite", user.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 space-y-6">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
          {t("nav.parent")}
        </span>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-on-surface">
          {t("parent.invite.title")}
        </h1>
        <p className="mt-1 text-sm text-secondary">
          {t("parent.invite.intro")}
        </p>
      </div>

      <ParentInviteForm disabled={!decision.ok} />

      <ParentLinkList
        links={linked.map((l) => ({
          linkId: l.linkId,
          studentName: l.studentName,
          studentEmail: l.studentEmail,
          status: l.status,
          cadence: l.cadence,
          sendHourUtc: l.sendHourUtc,
        }))}
      />
    </main>
  );
}