import Link from "next/link";

import { requireStudent } from "@/lib/permissions";
import { listBadgesForUser } from "@/services/gamification/badges";
import { getTranslator } from "@/i18n/server";

/**
 * R5 §4.4 — Badge shelf.
 *
 * Grid of every badge in the catalog, locked silhouettes + unlock
 * animations. Earned cards show their story (earned date + badge tier).
 * The page is server-rendered; `revalidatePath` after each earn keeps
 * it fresh on next navigation.
 */
export const dynamic = "force-dynamic";

export default async function BadgesPage() {
  const user = await requireStudent();
  const t = await getTranslator();
  const badges = await listBadgesForUser(user.id);

  const earned = badges.filter((b) => b.unlockedAt != null);
  const locked = badges.filter((b) => b.unlockedAt == null);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-wide text-secondary">
          {t("gamification.badges.kicker")}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-on-surface">
          {t("gamification.badges.title")}
        </h1>
        <p className="mt-2 text-sm text-secondary">
          {t.tn("gamification.badges.subtitle", earned.length, {
            earned: earned.length,
            total: badges.length,
          })}
        </p>
      </header>

      <nav
        aria-label="Badge sections"
        className="mb-6 inline-flex rounded-full border border-outline-variant bg-surface-container-lowest p-1 text-sm"
      >
        <SectionTab
          href="/student/badges"
          label={t("gamification.badges.tab.all")}
          active
        />
      </nav>

      <section
        aria-label="Earned badges"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {earned.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} earned />
        ))}
      </section>

      {locked.length > 0 ? (
        <>
          <h2 className="mt-10 mb-3 text-xs font-bold uppercase tracking-wider text-secondary">
            {t("gamification.badges.lockedHeading")}
          </h2>
          <section
            aria-label="Locked badges"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {locked.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} earned={false} />
            ))}
          </section>
        </>
      ) : null}

      <p className="mt-10 text-center">
        <Link
          href="/student"
          className="text-xs font-semibold text-primary hover:underline"
        >
          ← {t("nav.student.dashboard")}
        </Link>
      </p>
    </main>
  );
}

function SectionTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full bg-primary px-4 py-1.5 text-on-primary shadow-xs"
          : "rounded-full px-4 py-1.5 text-on-surface-variant hover:bg-surface-container-high"
      }
    >
      {label}
    </Link>
  );
}

const TIER_RING: Record<string, string> = {
  gold: "border-amber-300 bg-amber-50",
  silver: "border-slate-300 bg-slate-50",
  bronze: "border-orange-300 bg-orange-50",
};

function BadgeCard({
  badge,
  earned,
}: {
  badge: Awaited<ReturnType<typeof listBadgesForUser>>[number];
  earned: boolean;
}) {
  const tone = TIER_RING[badge.tier] ?? "border-outline-variant bg-surface-0";
  const percent =
    badge.target > 0
      ? Math.min(100, Math.round((badge.progress / badge.target) * 100))
      : 0;

  return (
    <article
      className={`relative flex flex-col gap-3 rounded-2xl border-2 p-5 shadow-2xs transition-all ${
        earned ? tone : "border-dashed border-outline-variant bg-surface-container-lowest opacity-90"
      }`}
    >
      <div className="flex items-start justify-between">
        <BadgeIcon icon={badge.icon} earned={earned} />
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            earned
              ? "bg-primary text-on-primary"
              : "bg-surface-container-high text-on-surface-variant"
          }`}
        >
          {badge.tier}
        </span>
      </div>
      <div>
        <h3 className="font-display text-base font-bold text-on-surface">
          {badge.titleKey}
        </h3>
        <p className="mt-1 text-xs text-secondary">{badge.descriptionKey}</p>
      </div>

      <div>
        <div className="flex items-center justify-between text-[10px] font-semibold text-secondary">
          <span>
            {badge.progress} / {badge.target}
          </span>
          <span className="font-mono">{percent}%</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-container-high">
          <div
            className={`h-full rounded-full ${earned ? "bg-primary" : "bg-outline"} transition-[width] duration-500`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {earned && badge.unlockedAt ? (
        <p className="text-[10px] font-medium text-secondary">
          Earned {new Date(badge.unlockedAt).toLocaleDateString()}
        </p>
      ) : null}
    </article>
  );
}

function BadgeIcon({ icon, earned }: { icon: string; earned: boolean }) {
  return (
    <span
      className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
        earned ? "bg-primary/10" : "bg-surface-container-high grayscale"
      }`}
      aria-hidden="true"
    >
      {icon === "flame" ? "🔥" :
        icon === "sprout" ? "🌱" :
        icon === "scroll" ? "📜" :
        icon === "chat" ? "💬" :
        icon === "star" ? "⭐" :
        icon === "calendar" ? "📅" :
        "🏅"}
    </span>
  );
}