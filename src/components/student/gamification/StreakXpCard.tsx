import Link from "next/link";

import { getStreak } from "@/services/gamification/streaks";
import { getCurrentLeague, getLeagueCohort } from "@/services/gamification/leagues";
import { getXpTotal } from "@/services/gamification/xp";
import { getTranslator } from "@/i18n/server";

interface StreakXpCardProps {
  userId: string;
  /** When true, render a compact horizontal layout for the lesson page. */
  compact?: boolean;
}

/**
 * R5 §4.1 — Right-rail streak / XP / league card.
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
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs">
        <StreakFlame days={currentDays} small />
        <LeaguePill league={league?.league ?? null} rank={league?.rank ?? null} total={cohort.cohort.length} compact />
        <span className="ml-auto font-mono text-sm font-bold text-on-surface">
          {t("gamification.card.xpThisWeek", { xp: formatXp(weekXp) })}
        </span>
      </div>
    );
  }

  return (
    <aside
      aria-label={t("gamification.card.ariaLabel")}
      className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs"
    >
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
          {t("gamification.card.title")}
        </h3>
        <Link
          href="/student/badges"
          className="text-[11px] font-semibold text-primary hover:underline"
        >
          {t("gamification.card.viewBadges")}
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StreakBlock
          days={currentDays}
          longest={longestDays}
          freezesAvailable={freezesAvailable}
        />
        <XpBlock weekXp={weekXp} allXp={allXp} />
      </div>

      <div className="mt-3 border-t border-outline-variant pt-3">
        <LeaguePill
          league={league?.league ?? null}
          rank={league?.rank ?? null}
          total={cohort.cohort.length}
        />
      </div>
    </aside>
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
    <span className={`inline-flex items-center gap-1.5 ${small ? "text-sm" : "text-base"} font-bold text-amber-600`}>
      <svg
        className={small ? "h-4 w-4" : "h-5 w-5"}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2c1.5 4-3 5-3 9a3 3 0 005 2 4 4 0 11-7-2c1-4 5-5 5-9z" />
      </svg>
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
    <div className="rounded-xl border border-outline-variant bg-surface-0 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
        Streak
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <StreakFlame days={days} />
        <span className="text-xs text-secondary">days</span>
      </div>
      <p className="mt-1 text-[10px] text-secondary">
        Longest: {longest} · ❄ {freezesAvailable}
      </p>
    </div>
  );
}

function XpBlock({ weekXp, allXp }: { weekXp: number; allXp: number }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-0 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
        XP
      </p>
      <p className="mt-1 font-display text-lg font-bold text-on-surface">
        {formatXp(weekXp)}{" "}
        <span className="text-xs font-medium text-secondary">this week</span>
      </p>
      <p className="mt-1 text-[10px] text-secondary">
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
      <span className="text-[10px] font-medium text-secondary">
        No league yet — earn XP to qualify.
      </span>
    );
  }
  const tone = LEAGUE_TONES[league] ?? "border-outline-variant bg-surface-0 text-on-surface";
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border ${tone} ${
        compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
      } font-semibold`}
    >
      <span className="uppercase tracking-wide">{league}</span>
      {rank != null ? (
        <span className="font-mono text-[10px] opacity-80">
          #{rank} / {total}
        </span>
      ) : null}
    </div>
  );
}