import Link from "next/link";

import { requireStudent } from "@/lib/permissions";
import { listBadgesForUser } from "@/services/gamification/badges";
import { getTranslator } from "@/i18n/server";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/shared/ui/page-header";
import { Container } from "@/components/shared/ui/container";
import { SectionHeader } from "@/components/shared/ui/section-header";
import { Progress } from "@/components/shared/ui/progress";
import { Badge } from "@/components/shared/ui/badge";
import { AwardIcon, TrophyIcon, HomeIcon, ChevronRightIcon } from "@/components/shared/ui/icons";

/**
 * R5 §4.4 — Badge shelf.
 *
 * Grid of every badge in the catalog, locked silhouettes + unlock
 * animations. Earned cards show their story (earned date + badge tier).
 * The page is server-rendered; `revalidatePath` after each earn keeps
 * it fresh on next navigation.
 */
export const dynamic = "force-dynamic";

const TIER_TONE: Record<string, "warning" | "muted" | "neutral"> = {
  gold: "warning",
  silver: "muted",
  bronze: "neutral",
};

export default async function BadgesPage() {
  const user = await requireStudent();
  const t = await getTranslator();
  const badges = await listBadgesForUser(user.id);

  const earned = badges.filter((b) => b.unlockedAt != null);
  const locked = badges.filter((b) => b.unlockedAt == null);

  return (
    <Container className="py-6 sm:py-8" size="lg">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs font-medium text-ink-500"
      >
        <Link href="/student" className="inline-flex items-center gap-1 hover:text-ink-900">
          <HomeIcon size={12} />
          {t("nav.student.dashboard")}
        </Link>
        <ChevronRightIcon size={12} className="text-outline" />
        <span className="text-ink-900">{t("gamification.badges.title")}</span>
      </nav>

      <div className="mt-3">
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-1.5 text-primary">
              <TrophyIcon size={14} />
              {t("gamification.badges.kicker")}
            </span>
          }
          title={t("gamification.badges.title")}
          description={t.tn("gamification.badges.subtitle", earned.length, {
            earned: earned.length,
            total: badges.length,
          })}
        />
      </div>

      <SectionHeader
        title={`Earned (${earned.length})`}
        className="mt-8"
      />

      {earned.length === 0 ? (
        <div className="mt-3 rounded-3xl border border-dashed border-outline-variant bg-surface-0 p-8 text-center">
          <p className="text-sm text-ink-500">
            {t("gamification.badges.noEarned")}
          </p>
        </div>
      ) : (
        <section
          aria-label="Earned badges"
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {earned.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} earned t={t} />
          ))}
        </section>
      )}

      {locked.length > 0 ? (
        <>
          <SectionHeader
            title={t("gamification.badges.lockedHeading")}
            className="mt-10"
          />
          <section
            aria-label="Locked badges"
            className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {locked.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} earned={false} t={t} />
            ))}
          </section>
        </>
      ) : null}
    </Container>
  );
}

function BadgeCard({
  badge,
  earned,
  t,
}: {
  badge: Awaited<ReturnType<typeof listBadgesForUser>>[number];
  earned: boolean;
  t: Awaited<ReturnType<typeof getTranslator>>;
}) {
  const percent =
    badge.target > 0
      ? Math.min(100, Math.round((badge.progress / badge.target) * 100))
      : 0;

  const tierTone = TIER_TONE[badge.tier] ?? "muted";

  return (
    <article
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-3xl border p-5 transition-all",
        earned
          ? "border-amber-300/60 bg-gradient-to-br from-amber-50 via-surface-0 to-surface-1"
          : "border-dashed border-outline-variant bg-surface-0 opacity-90",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <BadgeIcon icon={badge.icon} earned={earned} />
        <Badge tone={tierTone} size="xs">
          {badge.tier}
        </Badge>
      </div>

      <div className="min-w-0">
        <h3
          className={cn(
            "font-display text-base font-semibold",
            earned ? "text-ink-900" : "text-ink-700",
          )}
        >
          {badge.titleKey}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-ink-500">
          {badge.descriptionKey}
        </p>
      </div>

      <Progress
        value={percent}
        size="sm"
        tone={earned ? "success" : "primary"}
        label={`${badge.progress} / ${badge.target}`}
        showLabel
      />

      {earned && badge.unlockedAt ? (
        <p className="text-[11px] font-medium text-ink-500">
          {t("gamification.badges.earnedOn", {
            date: new Date(badge.unlockedAt).toLocaleDateString(),
          })}
        </p>
      ) : null}
    </article>
  );
}

function BadgeIcon({ icon, earned }: { icon: string; earned: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-12 w-12 items-center justify-center rounded-2xl",
        earned
          ? "bg-primary-container text-primary"
          : "bg-surface-2 text-ink-500 grayscale",
      )}
      aria-hidden="true"
    >
      <AwardIcon size={22} />
    </span>
  );
}
