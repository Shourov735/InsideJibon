import Link from "next/link";

import { getStreak } from "@/services/gamification/streaks";
import { getCurrentLeague, getLeagueCohort } from "@/services/gamification/leagues";
import { getXpTotal } from "@/services/gamification/xp";
import { getTranslator } from "@/i18n/server";
import { cn } from "@/lib/utils";

import { ChevronRightIcon, FlameIcon, TrophyIcon } from "@/components/shared/ui/icons";

interface StreakXpCardProps {
  userId: string;
  /** When true, render a compact horizontal layout for the lesson page. */
  compact?: boolean;
}

/**
 * R5 §4.1 — Streak / XP / league card.
 *
 * Renders the user's current daily streak (with freeze indicator), the
 * XP earned this week and the delta vs last week, and a league pill
 * with their rank within the cohort.
 *
 * Server component — pure read. Cheap: 3 small queries against indexed
 * rows (`daily_streaks` PK, `league_members` PK, `xp_events` aggregate).
 */
export async function StreakXpCard({ userId, compact = false }: StreakXpCardProps) {
  const t = await getTranslator();
  const [streak, league, cohort, weekXp, allXp] = await Promise.all([
    getStreak(userId),
    getCurrentLeague(userId),
    getLeagueCohort({ userId, limit: 50 }),
    getXpTotal(userId, { since: startOfThisWeek() }),
    getXpTotal(userId),
  ]);

  const currentDays = streak?.currentDays ?? 0;
  const longestDays = streak?.longestDays ?? 0;
  const freezesAvailable = streak?.freezesAvailable ?? 0;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-outline-variant bg-surface-0 p-3.5 sm:gap-4 sm:p-4">
        <StreakFlame days={currentDays} small />
        <LeaguePill
          league={league?.league ?? null}
          rank={league?.rank ?? null}
          total={cohort.cohort.length}
          compact
        />
        <span className="ml-auto text-sm font-bold text-ink-900">
          {t("gamification.card.xpThisWeek", { xp: formatXp(weekXp) })}
        </span>
      </div>
    );
  }

  return (
    <div
      aria-label={t("gamification.card.ariaLabel")}
      className="overflow-hidden rounded-3xl border border-outline-variant bg-surface-0"
    >
      <div className="flex items-center justify-between border-b border-outline-variant px-5 py-3.5">
        <h3 className="font-display text-xs font-bold uppercase tracking-wider text-primary">
          {t("gamification.card.title")}
        </h3>
        <Link
          href="/student/badges"
          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline"
        >
          {t("gamification.card.viewBadges")}
          <ChevronRightIcon size={10} />
        </Link>
      </div>

      <div className="grid grid-cols-2 divide-x divide-outline-variant">
        <StreakBlock
          days={currentDays}
          longest={longestDays}
          freezesAvailable={freezesAvailable}
        />
        <XpBlock weekXp={weekXp} allXp={allXp} />
      </div>

      <div className="border-t border-outline-variant px-5 py-3.5">
        <LeaguePill
          league={league?.league ?? null}
          rank={league?.rank ?? null}
          total={cohort.cohort.length}
        />
      </div>
    </div>
  );
}

function startOfThisWeek(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const back = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - back);
  return d;
}

function formatXp(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function StreakFlame({ days, small = false }: { days: number; small?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-bold text-amber-700",
        small ? "text-sm" : "text-base",
      )}
    >
      <FlameIcon size={small ? 14 : 18} className="text-amber-500" />
      {days}
    </span>
  );
}

function StreakBlock({
  days,
  longest,
  freezesAvailable,
}: {
  days: number;
  longest: number;
  freezesAvailable: number;
}) {
  return (
    <div className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        Streak
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <StreakFlame days={days} />
        <span className="text-xs text-ink-500">days</span>
      </div>
      <p className="mt-1 text-[10px] text-ink-500">
        Longest: {longest} · {freezesAvailable} freeze{freezesAvailable === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function XpBlock({ weekXp, allXp }: { weekXp: number; allXp: number }) {
  return (
    <div className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        XP
      </p>
      <p className="mt-1 font-display text-lg font-bold text-ink-900">
        {formatXp(weekXp)}{" "}
        <span className="text-xs font-medium text-ink-500">this week</span>
      </p>
      <p className="mt-1 text-[10px] text-ink-500">
        All time: {formatXp(allXp)}
      </p>
    </div>
  );
}

const LEAGUE_TONES: Record<string, string> = {
  diamond: "border-sky-300 bg-sky-50 text-sky-700",
  gold: "border-amber-300 bg-amber-50 text-amber-700",
  silver: "border-slate-300 bg-slate-50 text-slate-700",
  bronze: "border-orange-300 bg-orange-50 text-orange-700",
};

function LeaguePill({
  league,
  rank,
  total,
  compact = false,
}: {
  league: string | null;
  rank: number | null;
  total: number;
  compact?: boolean;
}) {
  if (!league) {
    return (
      <span className="text-[10px] font-medium text-ink-500">
        No league yet — earn XP to qualify.
      </span>
    );
  }
  const tone = LEAGUE_TONES[league] ?? "border-outline-variant bg-surface-0 text-ink-900";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-semibold",
        tone,
        compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
      )}
    >
      <TrophyIcon size={compact ? 12 : 14} />
      <span className="uppercase tracking-wide">{league}</span>
      {rank != null ? (
        <span className="font-mono text-[10px] opacity-80">
          #{rank} / {total}
        </span>
      ) : null}
    </div>
  );
}
