/**
 * R6 — payment submissions.
 *
 * Replaces the old `payment_intents` flow. A submission is a student's
 * claim that they sent money: trxID, last-4 of the sender number, amount,
 * optional screenshot. The admin (or the course owner for paid bundles)
 * approves or rejects.
 *
 * State machine:
 *
 *   submitted ───▶ under_review ───▶ approved ──▶ refunded
 *        │              │             │
 *        │              ▼             │
 *        └─────────▶ rejected          │
 *                       │             │
 *                       ▼             │
 *                   expired ◀─────────┘   (48h TTL; cron flips it)
 *
 * Approval auto-creates enrollment rows for each scope and a
 * `payment_receipts` row with a stable IJ-YYYY-NNNNNN receipt number.
 *
 * Every transition emits a `NOTIFICATIONS_QUEUE` payload; the consumer in
 * `src/services/notifications/notifications-consumer.ts` fans out to
 * in-app + email + web push (R10).
 */

import "server-only";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  auditLog,
  courses,
  courseBundleItems,
  courseBundles,
  enrollments,
  paymentEnrollments,
  paymentNumbers,
  paymentReceipts,
  paymentSubmissions,
  users,
  type PaymentNumber,
  type PaymentSubmission,
} from "@/db/schema";
import { enqueue } from "@/lib/cloudflare/queues";
import { dispatchPaymentReceipt } from "@/services/email/dispatcher";
import { createNotification } from "@/services/notifications";
import { LAST4_RE, SUBMISSION_TTL_HOURS, TRX_ID_RE } from "@/services/payments/constants";
import { isUuid } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class SubmissionNotFoundError extends Error {
  constructor() {
    super("Payment submission not found.");
  }
}

export class SubmissionAmountMismatchError extends Error {
  constructor(expected: number, received: number) {
    super(
      `Amount does not match the listed price (expected ৳${expected.toFixed(
        2
      )}, got ৳${received.toFixed(2)}).`
    );
  }
}

export class ScopeNotFoundError extends Error {
  constructor() {
    super("This course or bundle is not available for purchase.");
  }
}

export class ScopeNotPurchasableError extends Error {
  constructor() {
    super("This course is free — you don't need to pay for it.");
  }
}

export class NumberInactiveError extends Error {
  constructor() {
    super("This bKash number is no longer accepting payments.");
  }
}

export class InvalidTrxIdError extends Error {
  constructor() {
    super("Invalid TrxID. Expected 8–20 alphanumeric characters.");
  }
}

export class InvalidLast4Error extends Error {
  constructor() {
    super("Sender last-4 must be exactly 4 digits.");
  }
}

export class DuplicateSubmissionError extends Error {
  constructor() {
    super("You already submitted a payment for this course recently. Please wait 10 minutes.");
  }
}

export class SubmissionNotDecidableError extends Error {
  constructor() {
    super("This submission is no longer in a decidable state.");
  }
}

export class RejectionNoteRequiredError extends Error {
  constructor() {
    super("Rejection note is required (minimum 10 characters).");
  }
}

// ---------------------------------------------------------------------------
// Submission creation
// ---------------------------------------------------------------------------

export interface CreateSubmissionInput {
  userId: string;
  numberId: string;
  scopeKind: "bundle" | "course";
  scopeId: string;
  amountBdt: number;
  trxId: string;
  senderLast4: string;
  senderName?: string | null;
  payerNote?: string | null;
  whatsappSent?: boolean;
  screenshotKey?: string | null;
}

/**
 * Resolves the listed price for the scope (bundle or course). Returns the
 * BDT price and a small descriptor used for receipts / notifications.
 */
export async function resolveScopePrice(input: {
  scopeKind: "bundle" | "course";
  scopeId: string;
}): Promise<
  | {
      priceBdt: number;
      title: string;
      courseIds: string[];
      ownerId: string | null;
    }
  | null
> {
  if (!isUuid(input.scopeId)) return null;
  const db = getDb();

  if (input.scopeKind === "course") {
    const [row] = await db
      .select({
        id: courses.id,
        title: courses.title,
        priceBdt: courses.priceBdt,
        requiresPayment: courses.requiresPayment,
        teacherId: courses.teacherId,
        status: courses.status,
      })
      .from(courses)
      .where(eq(courses.id, input.scopeId))
      .limit(1);

    if (!row) return null;
    if (!row.requiresPayment) return null;
    const price = row.priceBdt ? Number(row.priceBdt) : null;
    if (price === null || !Number.isFinite(price) || price <= 0) return null;

    return {
      priceBdt: price,
      title: row.title,
      courseIds: [row.id],
      ownerId: row.teacherId,
    };
  }

  if (input.scopeKind === "bundle") {
    const [bundle] = await db
      .select({
        id: courseBundles.id,
        title: courseBundles.title,
        priceBdt: courseBundles.priceBdt,
        status: courseBundles.status,
      })
      .from(courseBundles)
      .where(eq(courseBundles.id, input.scopeId))
      .limit(1);

    if (!bundle || bundle.status !== "published") return null;

    const price = Number(bundle.priceBdt);
    if (!Number.isFinite(price) || price <= 0) return null;

    const items = await db
      .select({
        courseId: courseBundleItems.courseId,
        teacherId: courses.teacherId,
      })
      .from(courseBundleItems)
      .innerJoin(courses, eq(courses.id, courseBundleItems.courseId))
      .where(eq(courseBundleItems.bundleId, bundle.id));

    // The bundle has no single owner — we surface all teacher ids so the
    // approval notification can fan out to each course owner.
    return {
      priceBdt: price,
      title: bundle.title,
      courseIds: items.map((i) => i.courseId),
      ownerId: null,
    };
  }

  return null;
}

/**
 * Create a submission. The caller (server action) is responsible for
 * authorization and rate-limiting; this function only does the domain
 * checks. The unique index on (user, scope, 10-min bucket) prevents
 * accidental double-submits at the DB layer.
 */
export async function createSubmission(
  input: CreateSubmissionInput
): Promise<{ submission: PaymentSubmission; expiresAt: Date }> {
  const trx = input.trxId.trim();
  if (!TRX_ID_RE.test(trx)) throw new InvalidTrxIdError();

  const last4 = input.senderLast4.trim();
  if (!LAST4_RE.test(last4)) throw new InvalidLast4Error();

  if (!isUuid(input.numberId)) throw new NumberInactiveError();

  const db = getDb();

  // Verify the bKash number is currently active.
  const [number] = await db
    .select()
    .from(paymentNumbers)
    .where(eq(paymentNumbers.id, input.numberId))
    .limit(1);
  if (!number || number.status !== "active") {
    throw new NumberInactiveError();
  }

  // Resolve the scope's listed price.
  const scope = await resolveScopePrice({
    scopeKind: input.scopeKind,
    scopeId: input.scopeId,
  });
  if (!scope) {
    if (input.scopeKind === "course") {
      throw new ScopeNotPurchasableError();
    }
    throw new ScopeNotFoundError();
  }

  // Validate amount matches the listed price exactly.
  if (Math.abs(input.amountBdt - scope.priceBdt) > 0.005) {
    throw new SubmissionAmountMismatchError(scope.priceBdt, input.amountBdt);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SUBMISSION_TTL_HOURS * 3600_000);

  try {
    const [inserted] = await db
      .insert(paymentSubmissions)
      .values({
        userId: input.userId,
        numberId: number.id,
        scopeKind: input.scopeKind,
        scopeId: input.scopeId,
        amountBdt: input.amountBdt.toFixed(2),
        currency: "BDT",
        trxId: trx,
        senderLast4: last4,
        senderName: input.senderName?.trim() || null,
        payerNote: input.payerNote?.trim() || null,
        whatsappSent: Boolean(input.whatsappSent),
        screenshotKey: input.screenshotKey ?? null,
        status: "submitted",
        expiresAt,
      })
      .returning();

    if (!inserted) throw new Error("Failed to create payment submission.");
    await emitSubmittedNotification({
      submission: inserted,
      number,
      scopeTitle: scope.title,
      ownerId: scope.ownerId,
      courseIds: scope.courseIds,
    });
    return { submission: inserted, expiresAt };
  } catch (error) {
    // The unique dedupe index uses `floor(extract(epoch FROM created_at)/600)`,
    // so a 23505 surfaces as the friendly "wait 10 minutes" message.
    if (isUniqueViolation(error, "payment_submissions_dedupe_idx")) {
      throw new DuplicateSubmissionError();
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Review (claim / approve / reject)
// ---------------------------------------------------------------------------

export async function startReview(
  submissionId: string,
  adminId: string
): Promise<PaymentSubmission> {
  if (!isUuid(submissionId)) throw new SubmissionNotFoundError();
  const db = getDb();
  const [updated] = await db
    .update(paymentSubmissions)
    .set({
      status: "under_review",
      reviewedBy: adminId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(paymentSubmissions.id, submissionId),
        eq(paymentSubmissions.status, "submitted")
      )
    )
    .returning();

  if (!updated) {
    // Either not found, or already taken.
    const [existing] = await db
      .select()
      .from(paymentSubmissions)
      .where(eq(paymentSubmissions.id, submissionId))
      .limit(1);
    if (!existing) throw new SubmissionNotFoundError();
    throw new SubmissionNotDecidableError();
  }
  return updated;
}

export interface ApproveSubmissionResult {
  submission: PaymentSubmission;
  enrollmentIds: string[];
  receiptNumber: string;
}

export async function approveSubmission(
  submissionId: string,
  adminId: string,
  reviewNote?: string | null
): Promise<ApproveSubmissionResult> {
  if (!isUuid(submissionId)) throw new SubmissionNotFoundError();
  const db = getDb();

  const [submission] = await db
    .select()
    .from(paymentSubmissions)
    .where(eq(paymentSubmissions.id, submissionId))
    .limit(1);

  if (!submission) throw new SubmissionNotFoundError();
  if (!["submitted", "under_review"].includes(submission.status)) {
    throw new SubmissionNotDecidableError();
  }

  // Resolve the courses we need to enroll the student in.
  let courseIds: string[] = [];
  if (submission.scopeKind === "course") {
    courseIds = [submission.scopeId];
  } else if (submission.scopeKind === "bundle") {
    const rows = await db
      .select({ courseId: courseBundleItems.courseId })
      .from(courseBundleItems)
      .where(eq(courseBundleItems.bundleId, submission.scopeId));
    courseIds = rows.map((r) => r.courseId);
  }

  if (courseIds.length === 0) {
    throw new ScopeNotFoundError();
  }

  const now = new Date();

  // Atomically flip submitted/under_review → approved. drizzle-orm/neon-http
  // has no transactions, so the conditional UPDATE is the only safety net
  // against a double-approval race.
  const [updated] = await db
    .update(paymentSubmissions)
    .set({
      status: "approved",
      reviewedBy: adminId,
      reviewedAt: now,
      reviewNote: reviewNote?.trim() || null,
      updatedAt: now,
    })
    .where(
      and(
        eq(paymentSubmissions.id, submissionId),
        inArray(paymentSubmissions.status, ["submitted", "under_review"])
      )
    )
    .returning();

  if (!updated) throw new SubmissionNotDecidableError();

  // Create (or reactivate) enrollment rows + link them back.
  const enrollmentIds: string[] = [];
  for (const courseId of courseIds) {
    const [enrollment] = await db
      .insert(enrollments)
      .values({
        studentId: submission.userId,
        courseId,
        status: "active",
        decidedAt: now,
        decidedBy: adminId,
        enrolledAt: now,
      })
      .onConflictDoUpdate({
        target: [enrollments.studentId, enrollments.courseId],
        set: {
          status: "active",
          decidedAt: now,
          decidedBy: adminId,
        },
      })
      .returning();

    if (!enrollment) continue;
    enrollmentIds.push(enrollment.id);

    await db
      .insert(paymentEnrollments)
      .values({ submissionId: updated.id, enrollmentId: enrollment.id })
      .onConflictDoNothing();
  }

  // Generate a stable receipt number (IJ-YYYY-NNNNNN).
  const receiptNumber = await issueReceiptNumber(updated.id, submission.userId);

  await writeAuditRow({
    actorId: adminId,
    action: "payment.approved",
    subjectId: updated.id,
    metadata: {
      amount: Number(updated.amountBdt),
      scopeKind: updated.scopeKind,
      courseIds,
    },
  });

  await emitApprovedNotification({
    submission: updated,
    receiptNumber,
  });

  return { submission: updated, enrollmentIds, receiptNumber };
}

export async function rejectSubmission(
  submissionId: string,
  adminId: string,
  reviewNote: string
): Promise<PaymentSubmission> {
  if (!isUuid(submissionId)) throw new SubmissionNotFoundError();
  const trimmed = reviewNote.trim();
  if (trimmed.length < 10) throw new RejectionNoteRequiredError();

  const db = getDb();
  const now = new Date();

  const [updated] = await db
    .update(paymentSubmissions)
    .set({
      status: "rejected",
      reviewedBy: adminId,
      reviewedAt: now,
      reviewNote: trimmed,
      updatedAt: now,
    })
    .where(
      and(
        eq(paymentSubmissions.id, submissionId),
        inArray(paymentSubmissions.status, ["submitted", "under_review"])
      )
    )
    .returning();

  if (!updated) {
    const [existing] = await db
      .select()
      .from(paymentSubmissions)
      .where(eq(paymentSubmissions.id, submissionId))
      .limit(1);
    if (!existing) throw new SubmissionNotFoundError();
    throw new SubmissionNotDecidableError();
  }

  await writeAuditRow({
    actorId: adminId,
    action: "payment.rejected",
    subjectId: updated.id,
    metadata: { reviewNote: trimmed },
  });

  await emitRejectedNotification({ submission: updated });

  return updated;
}

// ---------------------------------------------------------------------------
// Expiration cron
// ---------------------------------------------------------------------------

/**
 * Flips every still-pending submission whose `expires_at` has elapsed to
 * `status='expired'`. Idempotent: re-running on an already-expired row is a
 * no-op (the WHERE filter excludes non-pending rows). Called from the
 * 5-min energy-refill cron slot so we don't burn a 6th cron trigger.
 */
export async function expireStaleSubmissions(now = new Date()): Promise<number> {
  const db = getDb();
  // Two steps (vs. UPDATE…RETURNING): we need to surface which rows
  // flipped so the audit log + notifications can fire.
  const stale = await db
    .select({ id: paymentSubmissions.id, userId: paymentSubmissions.userId, scopeId: paymentSubmissions.scopeId, scopeKind: paymentSubmissions.scopeKind })
    .from(paymentSubmissions)
    .where(
      and(
        inArray(paymentSubmissions.status, ["submitted", "under_review"]),
        sql`${paymentSubmissions.expiresAt} < ${now}`
      )
    )
    .limit(500);

  if (stale.length === 0) return 0;

  const expiredAt = new Date();
  for (const row of stale) {
    const [updated] = await db
      .update(paymentSubmissions)
      .set({ status: "expired", updatedAt: expiredAt })
      .where(
        and(
          eq(paymentSubmissions.id, row.id),
          inArray(paymentSubmissions.status, ["submitted", "under_review"])
        )
      )
      .returning();
    if (!updated) continue;

    await writeAuditRow({
      actorId: null,
      action: "payment.expired",
      subjectId: updated.id,
      metadata: { auto: true },
    });

    await emitExpiredNotification({ submission: updated }).catch(() => undefined);
  }
  return stale.length;
}

// ---------------------------------------------------------------------------
// Reads (for the admin queue + student payment detail page)
// ---------------------------------------------------------------------------

export async function getSubmissionById(
  id: string
): Promise<PaymentSubmission | null> {
  if (!isUuid(id)) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(paymentSubmissions)
    .where(eq(paymentSubmissions.id, id))
    .limit(1);
  return row ?? null;
}

export async function getAdminQueueRow(
  submissionId: string
): Promise<
  | (PaymentSubmission & {
      payerName: string | null;
      payerEmail: string;
      bkashNumber: string;
      holderName: string;
      receiptNumber: string | null;
    })
  | null
> {
  if (!isUuid(submissionId)) return null;
  const db = getDb();
  const [row] = await db
    .select({
      submission: paymentSubmissions,
      payerName: users.name,
      payerEmail: users.email,
      bkashNumber: paymentNumbers.bkashNumber,
      holderName: paymentNumbers.holderName,
    })
    .from(paymentSubmissions)
    .innerJoin(users, eq(users.id, paymentSubmissions.userId))
    .innerJoin(paymentNumbers, eq(paymentNumbers.id, paymentSubmissions.numberId))
    .where(eq(paymentSubmissions.id, submissionId))
    .limit(1);

  if (!row) return null;

  const [receipt] = await db
    .select({ receiptNumber: paymentReceipts.receiptNumber })
    .from(paymentReceipts)
    .where(eq(paymentReceipts.submissionId, submissionId))
    .limit(1);

  return {
    ...row.submission,
    payerName: row.payerName,
    payerEmail: row.payerEmail,
    bkashNumber: row.bkashNumber,
    holderName: row.holderName,
    receiptNumber: receipt?.receiptNumber ?? null,
  };
}

export interface AdminQueueFilter {
  status?: PaymentSubmission["status"];
  scopeKind?: "bundle" | "course";
  numberId?: string;
  search?: string;
  limit?: number;
  /** Keyset pagination cursor (created_at,id) base64-encoded. */
  cursor?: string | null;
}

export interface AdminQueueItem {
  id: string;
  status: PaymentSubmission["status"];
  scopeKind: "bundle" | "course";
  scopeId: string;
  amountBdt: number;
  trxId: string;
  senderLast4: string;
  senderName: string | null;
  payerName: string | null;
  payerEmail: string;
  bkashNumber: string;
  holderName: string;
  receiptNumber: string | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  createdAt: Date;
}

function decodeCursor(cursor: string | null | undefined): {
  createdAt: Date;
  id: string;
} | null {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64").toString("utf8")
    ) as { createdAt: string; id: string };
    return { createdAt: new Date(decoded.createdAt), id: decoded.id };
  } catch {
    return null;
  }
}

function encodeCursor(item: { createdAt: Date; id: string }): string {
  return Buffer.from(
    JSON.stringify({ createdAt: item.createdAt.toISOString(), id: item.id })
  ).toString("base64");
}

export async function listAdminQueue(
  filter: AdminQueueFilter = {}
): Promise<{ items: AdminQueueItem[]; nextCursor: string | null; total: number }> {
  const db = getDb();
  const limit = Math.max(
    1,
    Math.min(filter.limit ?? 25, 100)
  );

  const conditions = [] as ReturnType<typeof eq>[];
  if (filter.status) conditions.push(eq(paymentSubmissions.status, filter.status));
  if (filter.scopeKind)
    conditions.push(eq(paymentSubmissions.scopeKind, filter.scopeKind));
  if (filter.numberId) {
    if (!isUuid(filter.numberId)) return { items: [], nextCursor: null, total: 0 };
    conditions.push(eq(paymentSubmissions.numberId, filter.numberId));
  }
  if (filter.search) {
    const needle = `%${filter.search.trim().toLowerCase()}%`;
    conditions.push(sql`lower(${paymentSubmissions.trxId}) like ${needle}`);
  }

  const cursor = decodeCursor(filter.cursor);
  if (cursor) {
    conditions.push(
      sql`(${paymentSubmissions.createdAt}, ${paymentSubmissions.id}) < (${cursor.createdAt}, ${cursor.id})`
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: paymentSubmissions.id,
        status: paymentSubmissions.status,
        scopeKind: paymentSubmissions.scopeKind,
        scopeId: paymentSubmissions.scopeId,
        amountBdt: paymentSubmissions.amountBdt,
        trxId: paymentSubmissions.trxId,
        senderLast4: paymentSubmissions.senderLast4,
        senderName: paymentSubmissions.senderName,
        payerName: users.name,
        payerEmail: users.email,
        bkashNumber: paymentNumbers.bkashNumber,
        holderName: paymentNumbers.holderName,
        reviewedAt: paymentSubmissions.reviewedAt,
        reviewedBy: paymentSubmissions.reviewedBy,
        reviewNote: paymentSubmissions.reviewNote,
        createdAt: paymentSubmissions.createdAt,
        receiptNumber: paymentReceipts.receiptNumber,
      })
      .from(paymentSubmissions)
      .innerJoin(users, eq(users.id, paymentSubmissions.userId))
      .innerJoin(paymentNumbers, eq(paymentNumbers.id, paymentSubmissions.numberId))
      .leftJoin(paymentReceipts, eq(paymentReceipts.submissionId, paymentSubmissions.id))
      .where(where)
      .orderBy(desc(paymentSubmissions.createdAt), desc(paymentSubmissions.id))
      .limit(limit + 1),
    db
      .select({ total: count() })
      .from(paymentSubmissions)
      .where(where),
  ]);

  let nextCursor: string | null = null;
  let page = items;
  if (items.length > limit) {
    page = items.slice(0, limit);
    const last = page[page.length - 1];
    if (last) nextCursor = encodeCursor({ createdAt: last.createdAt, id: last.id });
  }

  return {
    items: page.map<AdminQueueItem>((row) => ({
      id: row.id,
      status: row.status as PaymentSubmission["status"],
      scopeKind: row.scopeKind as "bundle" | "course",
      scopeId: row.scopeId,
      amountBdt: Number(row.amountBdt),
      trxId: row.trxId,
      senderLast4: row.senderLast4,
      senderName: row.senderName,
      payerName: row.payerName,
      payerEmail: row.payerEmail,
      bkashNumber: row.bkashNumber,
      holderName: row.holderName,
      receiptNumber: row.receiptNumber,
      reviewNote: row.reviewNote,
      reviewedAt: row.reviewedAt,
      reviewedBy: row.reviewedBy,
      createdAt: row.createdAt,
    })),
    nextCursor,
    total: Number(total),
  };
}

export async function listStudentSubmissions(
  userId: string
): Promise<AdminQueueItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: paymentSubmissions.id,
      status: paymentSubmissions.status,
      scopeKind: paymentSubmissions.scopeKind,
      scopeId: paymentSubmissions.scopeId,
      amountBdt: paymentSubmissions.amountBdt,
      trxId: paymentSubmissions.trxId,
      senderLast4: paymentSubmissions.senderLast4,
      senderName: paymentSubmissions.senderName,
      payerName: users.name,
      payerEmail: users.email,
      bkashNumber: paymentNumbers.bkashNumber,
      holderName: paymentNumbers.holderName,
      reviewedAt: paymentSubmissions.reviewedAt,
      reviewedBy: paymentSubmissions.reviewedBy,
      reviewNote: paymentSubmissions.reviewNote,
      createdAt: paymentSubmissions.createdAt,
      receiptNumber: paymentReceipts.receiptNumber,
    })
    .from(paymentSubmissions)
    .innerJoin(users, eq(users.id, paymentSubmissions.userId))
    .innerJoin(paymentNumbers, eq(paymentNumbers.id, paymentSubmissions.numberId))
    .leftJoin(paymentReceipts, eq(paymentReceipts.submissionId, paymentSubmissions.id))
    .where(eq(paymentSubmissions.userId, userId))
    .orderBy(desc(paymentSubmissions.createdAt));

  return rows.map<AdminQueueItem>((row) => ({
    id: row.id,
    status: row.status as PaymentSubmission["status"],
    scopeKind: row.scopeKind as "bundle" | "course",
    scopeId: row.scopeId,
    amountBdt: Number(row.amountBdt),
    trxId: row.trxId,
    senderLast4: row.senderLast4,
    senderName: row.senderName,
    payerName: row.payerName,
    payerEmail: row.payerEmail,
    bkashNumber: row.bkashNumber,
    holderName: row.holderName,
    receiptNumber: row.receiptNumber,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt,
    reviewedBy: row.reviewedBy,
    createdAt: row.createdAt,
  }));
}

/**
 * Teacher-scoped queue: submissions whose scope is a course the teacher
 * owns. Bundles are excluded — those go to admins since they have no
 * single owner (the bundle doc lists all teacher ids but admins have the
 * final word per phase doc §4.4).
 */
export async function listTeacherQueue(
  teacherId: string,
  filter: { status?: PaymentSubmission["status"] } = {}
): Promise<AdminQueueItem[]> {
  const db = getDb();
  const conditions = [
    eq(paymentSubmissions.scopeKind, "course"),
  ] as ReturnType<typeof eq>[];

  if (filter.status) {
    conditions.push(eq(paymentSubmissions.status, filter.status));
  }

  // scopeId must be a course this teacher owns.
  const owned = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.teacherId, teacherId));
  if (owned.length === 0) return [];
  conditions.push(
    inArray(
      paymentSubmissions.scopeId,
      owned.map((o) => o.id)
    )
  );

  const rows = await db
    .select({
      id: paymentSubmissions.id,
      status: paymentSubmissions.status,
      scopeKind: paymentSubmissions.scopeKind,
      scopeId: paymentSubmissions.scopeId,
      amountBdt: paymentSubmissions.amountBdt,
      trxId: paymentSubmissions.trxId,
      senderLast4: paymentSubmissions.senderLast4,
      senderName: paymentSubmissions.senderName,
      payerName: users.name,
      payerEmail: users.email,
      bkashNumber: paymentNumbers.bkashNumber,
      holderName: paymentNumbers.holderName,
      reviewedAt: paymentSubmissions.reviewedAt,
      reviewedBy: paymentSubmissions.reviewedBy,
      reviewNote: paymentSubmissions.reviewNote,
      createdAt: paymentSubmissions.createdAt,
      receiptNumber: paymentReceipts.receiptNumber,
    })
    .from(paymentSubmissions)
    .innerJoin(users, eq(users.id, paymentSubmissions.userId))
    .innerJoin(paymentNumbers, eq(paymentNumbers.id, paymentSubmissions.numberId))
    .leftJoin(paymentReceipts, eq(paymentReceipts.submissionId, paymentSubmissions.id))
    .where(and(...conditions))
    .orderBy(desc(paymentSubmissions.createdAt));

  return rows.map<AdminQueueItem>((row) => ({
    id: row.id,
    status: row.status as PaymentSubmission["status"],
    scopeKind: row.scopeKind as "bundle" | "course",
    scopeId: row.scopeId,
    amountBdt: Number(row.amountBdt),
    trxId: row.trxId,
    senderLast4: row.senderLast4,
    senderName: row.senderName,
    payerName: row.payerName,
    payerEmail: row.payerEmail,
    bkashNumber: row.bkashNumber,
    holderName: row.holderName,
    receiptNumber: row.receiptNumber,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt,
    reviewedBy: row.reviewedBy,
    createdAt: row.createdAt,
  }));
}

export async function getDailyRevenueForDate(
  date: Date
): Promise<{ totalBdt: number; approvedCount: number }> {
  const db = getDb();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${paymentSubmissions.amountBdt}), 0)::numeric`,
      count: count(),
    })
    .from(paymentSubmissions)
    .where(
      and(
        eq(paymentSubmissions.status, "approved"),
        sql`${paymentSubmissions.reviewedAt} >= ${start}`,
        sql`${paymentSubmissions.reviewedAt} < ${end}`
      )
    );

  return {
    totalBdt: row ? Number(row.total) : 0,
    approvedCount: row ? Number(row.count) : 0,
  };
}

export async function getPendingApprovalCount(): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: count() })
    .from(paymentSubmissions)
    .where(
      inArray(paymentSubmissions.status, ["submitted", "under_review"])
    );
  return row ? Number(row.count) : 0;
}

// ---------------------------------------------------------------------------
// Refund status update helper (called by refunds.ts)
// ---------------------------------------------------------------------------

export async function markSubmissionRefunded(
  submissionId: string
): Promise<PaymentSubmission> {
  if (!isUuid(submissionId)) throw new SubmissionNotFoundError();
  const db = getDb();
  const [updated] = await db
    .update(paymentSubmissions)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(
      and(
        eq(paymentSubmissions.id, submissionId),
        eq(paymentSubmissions.status, "approved")
      )
    )
    .returning();
  if (!updated) throw new SubmissionNotFoundError();
  return updated;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function issueReceiptNumber(
  submissionId: string,
  userId: string
): Promise<string> {
  const db = getDb();
  const year = new Date().getUTCFullYear();
  const [{ count: yearlyCount }] = await db
    .select({ count: count() })
    .from(paymentReceipts)
    .where(
      sql`extract(year from ${paymentReceipts.issuedAt}) = ${year}`
    );
  const sequence = String(Number(yearlyCount) + 1).padStart(6, "0");
  const receiptNumber = `IJ-${year}-${sequence}`;

  await db.insert(paymentReceipts).values({
    submissionId,
    userId,
    receiptNumber,
  });

  return receiptNumber;
}

async function writeAuditRow(input: {
  actorId: string | null;
  action: string;
  subjectId: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const db = getDb();
  try {
    await db.insert(auditLog).values({
      actorId: input.actorId,
      action: input.action,
      subjectId: input.subjectId,
      metadata: input.metadata,
    });
  } catch (error) {
    console.error("[payments/submissions] audit write failed", error);
  }
}

function isUniqueViolation(error: unknown, indexName: string): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code !== "23505") return false;
  return typeof e.message === "string" && e.message.includes(indexName);
}

// ---------------------------------------------------------------------------
// Notification payloads (NOTIFICATIONS_QUEUE producer)
// ---------------------------------------------------------------------------

async function emitSubmittedNotification(input: {
  submission: PaymentSubmission;
  number: PaymentNumber;
  scopeTitle: string;
  ownerId: string | null;
  courseIds: string[];
}): Promise<void> {
  const db = getDb();
  // Notify every admin in-app + push + email.
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));
  const recipients = new Set<string>(admins.map((a) => a.id));
  if (input.ownerId) recipients.add(input.ownerId);

  // In-app notifications fan out.
  await Promise.all(
    [...recipients].map((recipientId) =>
      createNotification(recipientId, {
        type: "system",
        title: "Payment submitted / পেমেন্ট জমা",
        body: `${input.scopeTitle} — ৳${Number(input.submission.amountBdt).toFixed(0)} (${input.number.holderName})`,
        link: `/admin/payments/${input.submission.id}`,
      }).catch((error) => {
        console.error(
          "[payments/submissions] in-app notification failed",
          error
        );
      })
    )
  );

  // Queue: email + push fan-out for the same recipient set.
  await enqueue<{
    type: "payment.submitted";
    submissionId: string;
    recipients: string[];
    scopeKind: "bundle" | "course";
    scopeTitle: string;
    amountBdt: number;
    bkashNumber: string;
    holderName: string;
    trxId: string;
  }>("NOTIFICATIONS_QUEUE", {
    type: "payment.submitted",
    id: `payment.submitted:${input.submission.id}`,
    payload: {
      type: "payment.submitted",
      submissionId: input.submission.id,
      recipients: [...recipients],
      scopeKind: input.submission.scopeKind as "bundle" | "course",
      scopeTitle: input.scopeTitle,
      amountBdt: Number(input.submission.amountBdt),
      bkashNumber: input.number.bkashNumber,
      holderName: input.number.holderName,
      trxId: input.submission.trxId,
    },
  });
}

async function emitApprovedNotification(input: {
  submission: PaymentSubmission;
  receiptNumber: string;
}): Promise<void> {
  await enqueue<{
    type: "payment.approved";
    submissionId: string;
    receiptNumber: string;
    userId: string;
    scopeKind: "bundle" | "course";
    scopeId: string;
  }>("NOTIFICATIONS_QUEUE", {
    type: "payment.approved",
    id: `payment.approved:${input.submission.id}`,
    payload: {
      type: "payment.approved",
      submissionId: input.submission.id,
      receiptNumber: input.receiptNumber,
      userId: input.submission.userId,
      scopeKind: input.submission.scopeKind as "bundle" | "course",
      scopeId: input.submission.scopeId,
    },
  });

  // Best-effort transactional email + first-class receipt.
  try {
    await dispatchPaymentReceipt({
      userId: input.submission.userId,
      paymentId: input.submission.id,
      bkashRefLast4: input.submission.senderLast4,
      amountBdt: Number(input.submission.amountBdt),
      ctaUrl: `/student/payments/${input.submission.id}`,
    });
  } catch (error) {
    console.error("[payments/submissions] payment-receipt email failed", error);
  }
}

async function emitRejectedNotification(input: {
  submission: PaymentSubmission;
}): Promise<void> {
  await enqueue<{
    type: "payment.rejected";
    submissionId: string;
    userId: string;
    reviewNote: string | null;
  }>("NOTIFICATIONS_QUEUE", {
    type: "payment.rejected",
    id: `payment.rejected:${input.submission.id}`,
    payload: {
      type: "payment.rejected",
      submissionId: input.submission.id,
      userId: input.submission.userId,
      reviewNote: input.submission.reviewNote,
    },
  });
}

async function emitExpiredNotification(input: {
  submission: PaymentSubmission;
}): Promise<void> {
  await enqueue<{
    type: "payment.expired";
    submissionId: string;
    userId: string;
  }>("NOTIFICATIONS_QUEUE", {
    type: "payment.expired",
    id: `payment.expired:${input.submission.id}`,
    payload: {
      type: "payment.expired",
      submissionId: input.submission.id,
      userId: input.submission.userId,
    },
  });
}

// Helper used by emitSubmittedNotification — keeps the recipient union tidy.
// (Notifications flow through `createNotification` from
// `@/services/notifications` so the in-app surface stays consistent.)
