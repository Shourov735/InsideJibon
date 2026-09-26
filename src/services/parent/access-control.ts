import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { parentStudentLinks } from "@/db/schema";
import { isUuid } from "@/services/qna/threads";

/**
 * R7 — Parent access guard.
 *
 * Every parent-side READ service must call `assertCanReadStudent()`
 * before issuing any query that touches child-side data. The check is
 * the only authoritative source for "may parent <P> see student <S>?"
 * — layouts and route handlers are not security boundaries per
 * AGENTS.md, so route-level role checks alone are insufficient.
 *
 * The lookup is a single `parent_student_links` row indexed on
 * `(parent_id, status)`; cost is well under 5ms CPU even with several
 * hundred active parents. We never expose write paths through this
 * module: it strictly mediates read access.
 */

/**
 * Throws if `parentId` does NOT have an active link to `studentId`.
 * The error message is deliberately generic so that admin / log scrapers
 * cannot enumerate linked students by probing student ids.
 */
export async function assertCanReadStudent(
  parentId: string,
  studentId: string
): Promise<void> {
  if (!parentId || !studentId || parentId === studentId) {
    throw new ParentAccessDenied();
  }

  const db = getDb();
  const [row] = await db
    .select({ id: parentStudentLinks.id })
    .from(parentStudentLinks)
    .where(
      and(
        eq(parentStudentLinks.parentId, parentId),
        eq(parentStudentLinks.studentId, studentId),
        eq(parentStudentLinks.status, "active")
      )
    )
    .limit(1);

  if (!row) {
    throw new ParentAccessDenied();
  }
}

/**
 * Soft variant: returns false instead of throwing. Useful for
 * dashboard rendering where we want to silently omit children whose
 * link has been revoked since the parent loaded the page.
 */
export async function canReadStudent(
  parentId: string,
  studentId: string
): Promise<boolean> {
  if (!parentId || !studentId || parentId === studentId) return false;
  const db = getDb();
  const [row] = await db
    .select({ id: parentStudentLinks.id })
    .from(parentStudentLinks)
    .where(
      and(
        eq(parentStudentLinks.parentId, parentId),
        eq(parentStudentLinks.studentId, studentId),
        eq(parentStudentLinks.status, "active")
      )
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Returns all student ids the parent is currently allowed to read.
 * Used by the dashboard overview to short-circuit per-child permission
 * checks; reused by `getLinkedStudents()` in links.ts.
 */
export async function listActiveStudentIds(
  parentId: string
): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ studentId: parentStudentLinks.studentId })
    .from(parentStudentLinks)
    .where(
      and(
        eq(parentStudentLinks.parentId, parentId),
        eq(parentStudentLinks.status, "active")
      )
    );
  return rows.map((row) => row.studentId);
}

export class ParentAccessDenied extends Error {
  readonly code = "parent.access_denied";
  constructor() {
    super("Parent access denied.");
    this.name = "ParentAccessDenied";
  }
}

/**
 * Validate a uuid-ish link id on the read side. Never trust a
 * caller-supplied id without a guarded lookup — even an empty string
 * round-trips to a `null` row rather than a runtime crash.
 */
export function isLinkId(value: unknown): value is string {
  return typeof value === "string" && isUuid(value);
}
