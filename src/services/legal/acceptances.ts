import "server-only";
import { and, eq } from "drizzle-orm";
import { createHash } from "node:crypto";

import { getDb } from "@/db";
import { legalAcceptances, type LegalAcceptance } from "@/db/schema";
import { LEGAL_DOCS, type LegalDocKey } from "@/content/legal";

/**
 * R10 — Legal acceptances service.
 *
 * Records a row in `legal_acceptances` for each checkbox-confirm on
 * signup, /account/emails, or the in-app "view terms" footer. We
 * never store raw IPs or full user agents — only a SHA-256 of the IP
 * (so we can answer "same-network acceptances" without PII) and a
 * truncated user-agent.
 *
 * The table is append-only. No update path. This is intentional:
 * disputes should resolve via the versioned text + timestamp, not by
 * editing history.
 */

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

export async function recordAcceptance(input: {
  userId: string | null;
  doc: LegalDocKey;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<LegalAcceptance> {
  const db = getDb();
  const version = LEGAL_DOCS[input.doc];
  const [row] = await db
    .insert(legalAcceptances)
    .values({
      userId: input.userId,
      docKey: input.doc,
      version,
      ipHash: hashIp(input.ip ?? null),
      userAgent: input.userAgent
        ? input.userAgent.slice(0, 240) // truncate for sanity
        : null,
    })
    .returning();
  return row;
}

export async function hasAcceptedCurrent(input: {
  userId: string;
  doc: LegalDocKey;
}): Promise<boolean> {
  const db = getDb();
  const version = LEGAL_DOCS[input.doc];
  const [row] = await db
    .select({ id: legalAcceptances.id })
    .from(legalAcceptances)
    .where(
      and(
        eq(legalAcceptances.userId, input.userId),
        eq(legalAcceptances.docKey, input.doc),
        eq(legalAcceptances.version, version)
      )
    )
    .limit(1);
  return Boolean(row);
}

export async function listAcceptances(input: {
  userId: string;
}): Promise<LegalAcceptance[]> {
  const db = getDb();
  return db
    .select()
    .from(legalAcceptances)
    .where(eq(legalAcceptances.userId, input.userId));
}
