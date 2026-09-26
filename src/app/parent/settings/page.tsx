import { requireParent } from "@/lib/permissions";
import { getLinkedStudents } from "@/services/parent/links";
import { listDigestPrefsForParent } from "@/services/parent/digest-prefs";
import { getTranslator } from "@/i18n/server";
import { ParentSettingsClient } from "@/components/parent/parent-settings-client";

export const dynamic = "force-dynamic";

export default async function ParentSettingsPage() {
  const user = await requireParent();
  const t = await getTranslator();

  const [linked, prefs] = await Promise.all([
    getLinkedStudents(user.id),
    listDigestPrefsForParent(user.id),
  ]);

  const activeChildren = linked
    .filter((link) => link.status === "active")
    .map((link) => {
      const pref = prefs.find(
        (p) => p.studentId === link.studentId
      );
      return {
        linkId: link.linkId,
        studentId: link.studentId,
        studentName: link.studentName,
        studentEmail: link.studentEmail,
        cadence: pref?.cadence ?? link.cadence ?? "daily",
        sendHourUtc: pref?.sendHourUtc ?? link.sendHourUtc ?? 6,
      };
    });

  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 space-y-6">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
          {t("nav.parent.settings")}
        </span>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-on-surface">
          {t("parent.settings.title")}
        </h1>
        <p className="mt-1 text-sm text-secondary">
          {t("parent.settings.intro")}
        </p>
      </div>

      <ParentSettingsClient
        activeChildren={activeChildren}
        email={user.email}
      />
    </main>
  );
}
