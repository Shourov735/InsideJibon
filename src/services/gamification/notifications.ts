import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { notifications, type Notification } from "@/db/schema";
import { createNotification } from "@/services/notifications";

/**
 * R5 — Celebration notifications.
 *
 * The "celebration" overlay fires when a user unlocks a badge, levels
 * up a streak, or gets promoted to a higher league. We don't have a
 * dedicated `celebrations` table — the existing `notifications` table
 * is enough. The `kind` we set is `system` (the only available enum
 * value at this phase) with a `link` that opens the relevant page.
 *
 * The 24-hour cooldown prevents toast spam when a student unlocks
 * several badges in quick succession (e.g. the streak_3 / streak_7
 * cascade). The cooldown is checked via a lookup on the most recent
 * `system`-tagged notification for the user; we rate-limit per
 * `title` substring to allow different celebration types through.
 */

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h per (user, kind, dedupeKey)

export type CelebrationKind = "streakDay" | "levelUp" | "badgeUnlocked" | "leaguePromoted";

export interface CelebrationInput {
  userId: string;
  kind: CelebrationKind;
  title: string;
  body: string;
  link?: string;
  /** Stable key that groups identical celebrations (e.g. `badge:streak_7`). */
  dedupeKey: string;
}

/**
 * Persists a celebration notification, honoring the 24h cooldown.
 * Returns the created row on success, or null when suppressed by the
 * cooldown. Web Push delivery is left to R9 (not implemented yet —
 * this hook is the integration point).
 */
export async function emitCelebration(
  input: CelebrationInput
): Promise<Notification | null> {
  const db = getDb();
  const since = new Date(Date.now() - COOLDOWN_MS);

  // Rate limit: don't fire the same dedupeKey within 24h.
  const [recent] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, input.userId),
        eq(notifications.type, "system"),
        gte(notifications.createdAt, since),
        sql`${notifications.body} LIKE ${"%" + input.dedupeKey + "%"}`
      )
    )
    .limit(1);

  if (recent) return null;

  const created = await createNotification(input.userId, {
    type: "system",
    title: input.title,
    body: `${input.body} · ${input.dedupeKey}`,
    link: input.link,
  });

  // Web Push hook (R9) — not implemented yet. Place here so callers
  // don't have to wire it.
  return created;
}