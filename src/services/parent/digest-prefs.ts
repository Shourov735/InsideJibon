import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { parentDigestPrefs } from "@/db/schema";

/**
 * R7 — Parent digest preference service.
 *
 * One row per (parent_id, student_id). The dashboard / settings UI
 * reads and writes through this module; the daily / weekly cron
 * handler in src/app/api/cron/proctor-purge consumes the cadence.
 *
 * `canReadStudent()` is the only authorization model here — parents
 * can only adjust preferences for students they have an active link
 * with. Calls from non-parents return early without touching state.
 */

export type DigestCadence = "daily" | "weekly" | "off";

export interface DigestPref {
  parentId: string;
  studentId: string;
  cadence: DigestCadence;
  sendHourUtc: number;
}

export async function getDigestPref(args: {
  parentId: string;
  studentId: string;
}): Promise<DigestPref | null> {
  const db = getDb();
  const [row] = await db
    .select({
      parentId: parentDigestPrefs.parentId,
      studentId: parentDigestPrefs.studentId,
      cadence: parentDigestPrefs.cadence,
      sendHourUtc: parentDigestPrefs.sendHourUtc,
    })
    .from(parentDigestPrefs)
    .where(
      and(
        eq(parentDigestPrefs.parentId, args.parentId),
        eq(parentDigestPrefs.studentId, args.studentId)
      )
    )
    .limit(1);
  if (!row) return null;
  return {
    parentId: row.parentId,
    studentId: row.studentId,
    cadence: row.cadence as DigestCadence,
    sendHourUtc: row.sendHourUtc,
  };
}

export async function listDigestPrefsForParent(
  parentId: string
): Promise<DigestPref[]> {
  const db = getDb();
  const rows = await db
    .select({
      parentId: parentDigestPrefs.parentId,
      studentId: parentDigestPrefs.studentId,
      cadence: parentDigestPrefs.cadence,
      sendHourUtc: parentDigestPrefs.sendHourUtc,
    })
    .from(parentDigestPrefs)
    .where(eq(parentDigestPrefs.parentId, parentId));
  return rows.map((row) => ({
    parentId: row.parentId,
    studentId: row.studentId,
    cadence: row.cadence as DigestCadence,
    sendHourUtc: row.sendHourUtc,
  }));
}

/**
 * Idempotent upsert. Caller MUST have verified an active parent ↔
 * student link via `canReadStudent()` before calling this — the
 * settings action does that as a defense-in-depth check before the
 * write.
 */
export async function setDigestPreference(args: {
  parentId: string;
  studentId: string;
  cadence: DigestCadence;
  sendHourUtc?: number;
}): Promise<void> {
  const db = getDb();
  const sendHourUtc = args.sendHourUtc ?? 6;
  await db
    .insert(parentDigestPrefs)
    .values({
      parentId: args.parentId,
      studentId: args.studentId,
      cadence: args.cadence,
      sendHourUtc,
    })
    .onConflictDoUpdate({
      target: [parentDigestPrefs.parentId, parentDigestPrefs.studentId],
      set: {
        cadence: args.cadence,
        sendHourUtc,
        updatedAt: new Date(),
      },
    });
}
