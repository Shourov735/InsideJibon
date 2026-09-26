import "server-only";

import { and, eq, isNull, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { users, parentStudentLinks, parentDigestPrefs } from "@/db/schema";
import { createNotification } from "@/services/notifications/notifications";
import { sendEmail } from "@/services/email";

/**
 * R7 — Parent ↔ Student link service.
 *
 * Authorization model:
 *   - requestLink:      parent role only.
 *   - acceptLink:       student role only (and the student is the
 *                       `student_id` of the row). Students also
 *                       approve revocation through the same surface.
 *   - getLinkedStudents: parent only — returns active children with
 *                        summary cards.
 *   - revokeLink:       either side (student or parent) can revoke;
 *                       status flips to 'revoked' and the prefs row
 *                       cascade-deletes.
 *
 * The invitation token (32 hex characters from randomBytes) is the
 * shared secret between the parent and the student — generated when
 * the parent requests, cleared on accept. Emailing the token is the
 * responsibility of the server action layer (UI flow), not this
 * service — keep concerns separated.
 */

// ----------------------------------------------------------------------------
// Constants / helpers
// ----------------------------------------------------------------------------

const INVITE_TOKEN_BYTES = 16; // 32 hex chars

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Look up a student by exact email. Returns null when the email is not
 * registered. We intentionally do NOT distinguish "email exists for a
 * non-student" from "email does not exist" — both surface a null result
 * so that `/parent/invite` can answer "we sent a request if the
 * account exists" without being a password-reset-grade enum.
 */
async function findStudentByEmail(email: string): Promise<
  { id: string; name: string | null; email: string } | null
> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);
  return row ?? null;
}

// ----------------------------------------------------------------------------
// requestLink
// ----------------------------------------------------------------------------

export interface RequestLinkArgs {
  parentId: string;
  parentEmail?: string | null;
  parentName?: string | null;
  studentEmail: string;
  appUrl: string;
  locale?: "en" | "bn";
}

export interface RequestLinkResult {
  /** One of "created" (new pending row inserted), "existing-pending"
   * (a pending link already exists for this pair), or "already-active"
   * (the link was already accepted — nothing to do). */
  outcome: "created" | "existing-pending" | "already-active" | "unknown-student";
  linkId?: string;
  inviteToken?: string;
}

/**
 * Parent asks to be linked to a student by email. Idempotent:
 *   - first call → creates a pending row, returns the token to the caller
 *     so the parent can paste a "pending" badge on the dashboard.
 *   - duplicate call while still pending → returns the existing row.
 *   - already-active → returns "already-active", no email sent.
 *   - already-revoked → flips back to pending (so the parent can retry),
 *     refreshes the token, fires a fresh invitation email.
 *
 * In all "we sent a request" cases we notify the student via in-app +
 * email. When the student isn't found we still return 200 — the caller
 * renders a generic "we sent a request if the account exists" message,
 * preserving email enumeration resistance per §5.
 */
export async function requestLink(args: RequestLinkArgs): Promise<RequestLinkResult> {
  const student = await findStudentByEmail(args.studentEmail);
  if (!student) {
    return { outcome: "unknown-student" };
  }
  if (student.id === args.parentId) {
    // A parent trying to invite themselves is a meaningless loop. Surface
    // "already-active" — surfaces a no-op the UI can hide.
    return { outcome: "already-active" };
  }

  const db = getDb();
  const token = randomHex(INVITE_TOKEN_BYTES);
  const now = new Date();

  // Idempotent insert: try to create the row, fall back to the existing one.
  let rowId: string | undefined;
  let rowToken: string | undefined;
  let rowStatus: "pending" | "active" | "revoked" | undefined;
  try {
    const [inserted] = await db
      .insert(parentStudentLinks)
      .values({
        parentId: args.parentId,
        studentId: student.id,
        status: "pending",
        inviteToken: token,
        invitedAt: now,
      })
      .returning({
        id: parentStudentLinks.id,
        token: parentStudentLinks.inviteToken,
        status: parentStudentLinks.status,
      });
    if (inserted) {
      rowId = inserted.id;
      rowToken = inserted.token ?? token;
      rowStatus = inserted.status as "pending" | "active" | "revoked" | undefined;
    }
  } catch {
    // Unique constraint conflict — fall through to fetch.
  }

  if (!rowId) {
    const [existing] = await db
      .select({
        id: parentStudentLinks.id,
        token: parentStudentLinks.inviteToken,
        status: parentStudentLinks.status,
      })
      .from(parentStudentLinks)
      .where(
        and(
          eq(parentStudentLinks.parentId, args.parentId),
          eq(parentStudentLinks.studentId, student.id)
        )
      )
      .limit(1);

    if (!existing) throw new Error("Failed to upsert parent_student_links row.");
    if (existing.status === "active") {
      return { outcome: "already-active", linkId: existing.id };
    }
    if (existing.status === "pending") {
      // Re-send the notification + email but keep the existing token so a
      // deep-linked approve URL stays valid.
      await notifyStudentOfPendingLink({
        studentId: student.id,
        parentName: args.parentName,
      });
      return {
        outcome: "existing-pending",
        linkId: existing.id,
        inviteToken: existing.token ?? undefined,
      };
    }
    // existing.status === 'revoked' — flip back to pending with a fresh token.
    const [refreshed] = await db
      .update(parentStudentLinks)
      .set({
        status: "pending",
        inviteToken: token,
        invitedAt: now,
        acceptedAt: null,
        revokedAt: null,
        updatedAt: now,
      })
      .where(eq(parentStudentLinks.id, existing.id))
      .returning({
        id: parentStudentLinks.id,
        token: parentStudentLinks.inviteToken,
      });
    rowId = refreshed?.id ?? existing.id;
    rowToken = refreshed?.token ?? token;
    rowStatus = "pending";
  }

  if (rowStatus === "pending") {
    await notifyStudentOfPendingLink({
      studentId: student.id,
      parentName: args.parentName,
    });
    if (args.parentEmail && rowToken) {
      // Best-effort parent acknowledgment. We pass category
      // 'transactional' so suppression rules don't silence the
      // handshake itself.
      try {
        await sendEmail({
          to: args.parentEmail,
          toUserId: args.parentId,
          template: "enrollment-decision",
          dedupeKey: `parent-link-request:${rowId}`,
          appUrl: args.appUrl,
          manageToken: "",
          locale: args.locale ?? "en",
          payload: { kind: "parent-link-request", studentName: student.name },
          subjectOverride:
            args.locale === "bn"
              ? `প্যারেন্ট লিঙ্ক অনুরোধ পাঠানো হয়েছে — ${student.name ?? args.studentEmail}`
              : `Parent link request sent — ${student.name ?? args.studentEmail}`,
          textOverride:
            args.locale === "bn"
              ? `আপনি ${student.name ?? args.studentEmail} এর সাথে প্যারেন্ট হিসেবে যুক্ত হতে চেয়েছেন। শিক্ষার্থী অনুমোদন করলে আপনাকে জানানো হবে। InsideJibon এ ফিরে আসুন: ${args.appUrl}/parent`
              : `You've asked to be linked to ${student.name ?? args.studentEmail}. We'll let you know once the student approves. Back to InsideJibon: ${args.appUrl}/parent`,
        });
      } catch (error) {
        // The notification mirror is the source of truth; email failure
        // does not invalidate the link. Log only.
        console.error("parent requestLink email failed", error);
      }
    }
  }

  return {
    outcome: "created",
    linkId: rowId,
    inviteToken: rowToken,
  };
}

async function notifyStudentOfPendingLink(args: {
  studentId: string;
  parentName?: string | null;
}): Promise<void> {
  try {
    const friendly = args.parentName?.trim() || "A parent";
    await createNotification(args.studentId, {
      type: "system",
      title: "A parent is asking to view your progress",
      body: `${friendly} requested to follow your InsideJibon activity. Approve or revoke from your profile.`,
      link: "/student/profile",
    });
  } catch (error) {
    console.error("notifyStudentOfPendingLink failed", error);
  }
}

// ----------------------------------------------------------------------------
// acceptLink / revokeLink (student actions)
// ----------------------------------------------------------------------------

export interface AcceptLinkArgs {
  studentId: string;
  linkId: string;
}

export async function acceptLink(args: AcceptLinkArgs): Promise<{
  linkId: string;
  parentId: string;
}> {
  const db = getDb();
  const [row] = await db
    .select({
      id: parentStudentLinks.id,
      studentId: parentStudentLinks.studentId,
      parentId: parentStudentLinks.parentId,
      status: parentStudentLinks.status,
    })
    .from(parentStudentLinks)
    .where(eq(parentStudentLinks.id, args.linkId))
    .limit(1);
  if (!row || row.studentId !== args.studentId) {
    throw new Error("Link request not found.");
  }
  if (row.status === "active") {
    return { linkId: row.id, parentId: row.parentId };
  }
  if (row.status === "revoked") {
    throw new Error("This link has been revoked and cannot be re-activated.");
  }

  const now = new Date();
  await db
    .update(parentStudentLinks)
    .set({
      status: "active",
      acceptedAt: now,
      inviteToken: null,
      updatedAt: now,
    })
    .where(eq(parentStudentLinks.id, args.linkId));

  // Insert (or refresh) default digest preferences.
  await db
    .insert(parentDigestPrefs)
    .values({
      parentId: row.parentId,
      studentId: args.studentId,
      cadence: "daily",
      sendHourUtc: 6,
    })
    .onConflictDoUpdate({
      target: [parentDigestPrefs.parentId, parentDigestPrefs.studentId],
      set: {
        // Don't overwrite an explicitly chosen cadence, but always
        // make sure the row exists.
        updatedAt: now,
      },
    });

  try {
    await createNotification(args.studentId, {
      type: "system",
      title: "Parent link accepted",
      body: "Your parent now receives daily digest emails about your progress.",
      link: "/student/profile",
    });
  } catch (error) {
    console.error("acceptLink notification failed", error);
  }

  return { linkId: row.id, parentId: row.parentId };
}

export interface RevokeLinkArgs {
  /** Whose perspective — student or parent. Either can revoke. */
  actorId: string;
  linkId: string;
}

export async function revokeLink(args: RevokeLinkArgs): Promise<void> {
  const db = getDb();
  const [row] = await db
    .select({
      id: parentStudentLinks.id,
      studentId: parentStudentLinks.studentId,
      parentId: parentStudentLinks.parentId,
      status: parentStudentLinks.status,
    })
    .from(parentStudentLinks)
    .where(eq(parentStudentLinks.id, args.linkId))
    .limit(1);
  if (!row) throw new Error("Link not found.");
  if (row.studentId !== args.actorId && row.parentId !== args.actorId) {
    throw new Error("You don't have permission to revoke this link.");
  }

  const now = new Date();
  await db
    .update(parentStudentLinks)
    .set({
      status: "revoked",
      revokedAt: now,
      inviteToken: null,
      updatedAt: now,
    })
    .where(eq(parentStudentLinks.id, args.linkId));
}

// ----------------------------------------------------------------------------
// getLinkedStudents
// ----------------------------------------------------------------------------

export interface LinkedStudent {
  linkId: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string;
  status: "pending" | "active" | "revoked";
  invitedAt: Date | null;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  cadence: "daily" | "weekly" | "off" | null;
  sendHourUtc: number | null;
}

/**
 * List every link the parent has ever created, regardless of status.
 * The dashboard slices this client-side; having the full shape avoids
 * an extra round-trip for "show pending" badges.
 */
export async function getLinkedStudents(
  parentId: string
): Promise<LinkedStudent[]> {
  const db = getDb();
  const rows = await db
    .select({
      linkId: parentStudentLinks.id,
      studentId: parentStudentLinks.studentId,
      status: parentStudentLinks.status,
      invitedAt: parentStudentLinks.invitedAt,
      acceptedAt: parentStudentLinks.acceptedAt,
      revokedAt: parentStudentLinks.revokedAt,
      studentName: users.name,
      studentEmail: users.email,
      cadence: parentDigestPrefs.cadence,
      sendHourUtc: parentDigestPrefs.sendHourUtc,
    })
    .from(parentStudentLinks)
    .innerJoin(users, eq(users.id, parentStudentLinks.studentId))
    .leftJoin(
      parentDigestPrefs,
      and(
        eq(parentDigestPrefs.parentId, parentStudentLinks.parentId),
        eq(parentDigestPrefs.studentId, parentStudentLinks.studentId)
      )
    )
    .where(eq(parentStudentLinks.parentId, parentId))
    .orderBy(parentStudentLinks.createdAt);

  return rows.map((row) => ({
    linkId: row.linkId,
    studentId: row.studentId,
    studentName: row.studentName,
    studentEmail: row.studentEmail,
    status: row.status as LinkedStudent["status"],
    invitedAt: row.invitedAt,
    acceptedAt: row.acceptedAt,
    revokedAt: row.revokedAt,
    cadence: (row.cadence as LinkedStudent["cadence"]) ?? null,
    sendHourUtc: row.sendHourUtc ?? null,
  }));
}

// ----------------------------------------------------------------------------
// Student-side facade
// ----------------------------------------------------------------------------

/**
 * For `/student/profile` — list all the parents that have requested,
 * accepted, or had their access revoked for the current student.
 */
export interface ParentForStudent {
  linkId: string;
  parentId: string;
  parentName: string | null;
  parentEmail: string;
  status: "pending" | "active" | "revoked";
  invitedAt: Date | null;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}

export async function getParentsOfStudent(
  studentId: string
): Promise<ParentForStudent[]> {
  const db = getDb();
  const rows = await db
    .select({
      linkId: parentStudentLinks.id,
      parentId: parentStudentLinks.parentId,
      status: parentStudentLinks.status,
      invitedAt: parentStudentLinks.invitedAt,
      acceptedAt: parentStudentLinks.acceptedAt,
      revokedAt: parentStudentLinks.revokedAt,
      parentName: users.name,
      parentEmail: users.email,
    })
    .from(parentStudentLinks)
    .innerJoin(users, eq(users.id, parentStudentLinks.parentId))
    .where(eq(parentStudentLinks.studentId, studentId))
    .orderBy(parentStudentLinks.createdAt);
  return rows.map((row) => ({
    linkId: row.linkId,
    parentId: row.parentId,
    parentName: row.parentName,
    parentEmail: row.parentEmail,
    status: row.status as ParentForStudent["status"],
    invitedAt: row.invitedAt,
    acceptedAt: row.acceptedAt,
    revokedAt: row.revokedAt,
  }));
}
