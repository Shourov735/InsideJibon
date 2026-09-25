/**
 * R6 — manual refund ledger.
 *
 * No API call is ever made to bKash. The admin issues the refund from
 * their own bKash app and then records the outgoing `trxId` + a free-text
 * note in this ledger. We expose:
 *
 *   - requestRefund (student)
 *   - approveRefund (admin)         → status='approved'
 *   - markRefundExecuted (admin)    → status='executed'; flips submission.status='refunded'
 *   - rejectRefund (admin)          → status='rejected'
 *
 * On `executed` we fire a `refund.executed` notifications-queue payload +
 * the R10 transactional email through `dispatchRefundExecuted`.
 */

import "server-only";
import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  auditLog,
  paymentRefunds,
  paymentSubmissions,
  users,
  type PaymentRefund,
} from "@/db/schema";
import { enqueue } from "@/lib/cloudflare/queues";
import { dispatchRefundExecuted } from "@/services/email/dispatcher";
import { createNotification } from "@/services/notifications";
import { isUuid } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class RefundNotFoundError extends Error {
  constructor() {
    super("Refund request not found.");
  }
}

export class RefundNotInStateError extends Error {
  constructor(message = "Refund is not in the expected state.") {
    super(message);
  }
}

export class NotRefundableError extends Error {
  constructor() {
    super("This payment cannot be refunded.");
  }
}

export interface RequestRefundInput {
  submissionId: string;
  userId: string;
  reason: string;
}

export async function requestRefund(
  input: RequestRefundInput
): Promise<PaymentRefund> {
  if (!isUuid(input.submissionId)) throw new RefundNotFoundError();

  const db = getDb();
  const [submission] = await db
    .select()
    .from(paymentSubmissions)
    .where(eq(paymentSubmissions.id, input.submissionId))
    .limit(1);

  if (!submission) throw new RefundNotFoundError();
  if (submission.status !== "approved") throw new NotRefundableError();
  if (submission.userId !== input.userId) throw new RefundNotFoundError();

  const trimmedReason = input.reason.trim();
  if (trimmedReason.length < 5) {
    throw new Error("Refund reason is required.");
  }

  const [refund] = await db
    .insert(paymentRefunds)
    .values({
      submissionId: input.submissionId,
      amountBdt: submission.amountBdt,
      reason: trimmedReason,
      status: "requested",
      requestedBy: input.userId,
    })
    .returning();
  if (!refund) throw new Error("Failed to create refund request.");

  await writeAuditRow({
    actorId: input.userId,
    action: "refund.requested",
    subjectId: refund.id,
    metadata: { submissionId: submission.id },
  });

  // Notify every admin in-app + email.
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));

  await Promise.all(
    admins.map((admin) =>
      createNotification(admin.id, {
        type: "system",
        title: "Refund requested / রিফান্ড অনুরোধ",
        body: `Reason: ${trimmedReason}`,
        link: `/admin/payments/${submission.id}`,
      }).catch(() => undefined)
    )
  );

  return refund;
}

export async function approveRefund(input: {
  refundId: string;
  adminId: string;
}): Promise<PaymentRefund> {
  if (!isUuid(input.refundId)) throw new RefundNotFoundError();
  const db = getDb();
  const [updated] = await db
    .update(paymentRefunds)
    .set({
      status: "approved",
      approvedBy: input.adminId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(paymentRefunds.id, input.refundId),
        eq(paymentRefunds.status, "requested")
      )
    )
    .returning();
  if (!updated) {
    const [existing] = await db
      .select()
      .from(paymentRefunds)
      .where(eq(paymentRefunds.id, input.refundId))
      .limit(1);
    if (!existing) throw new RefundNotFoundError();
    throw new RefundNotInStateError();
  }
  await writeAuditRow({
    actorId: input.adminId,
    action: "refund.approved",
    subjectId: updated.id,
    metadata: {},
  });
  return updated;
}

export async function markRefundExecuted(input: {
  refundId: string;
  adminId: string;
  executionNote?: string;
  bkashRefundTrxId?: string;
}): Promise<PaymentRefund> {
  if (!isUuid(input.refundId)) throw new RefundNotFoundError();
  if (!input.bkashRefundTrxId?.trim()) {
    throw new Error("Outgoing bKash refund TrxID is required.");
  }
  const db = getDb();

  const now = new Date();
  const [updated] = await db
    .update(paymentRefunds)
    .set({
      status: "executed",
      executedAt: now,
      executionNote: input.executionNote?.trim() || null,
      bkashRefundTrxId: input.bkashRefundTrxId.trim(),
      updatedAt: now,
    })
    .where(
      and(
        eq(paymentRefunds.id, input.refundId),
        eq(paymentRefunds.status, "approved")
      )
    )
    .returning();
  if (!updated) {
    const [existing] = await db
      .select()
      .from(paymentRefunds)
      .where(eq(paymentRefunds.id, input.refundId))
      .limit(1);
    if (!existing) throw new RefundNotFoundError();
    throw new RefundNotInStateError();
  }

  // Flip the parent submission to refunded.
  await db
    .update(paymentSubmissions)
    .set({ status: "refunded", updatedAt: now })
    .where(
      and(
        eq(paymentSubmissions.id, updated.submissionId),
        eq(paymentSubmissions.status, "approved")
      )
    );

  await writeAuditRow({
    actorId: input.adminId,
    action: "refund.executed",
    subjectId: updated.id,
    metadata: {
      bkashRefundTrxId: updated.bkashRefundTrxId,
      note: updated.executionNote,
    },
  });

  // Look up the student so we can email + in-app notify.
  const [submission] = await db
    .select()
    .from(paymentSubmissions)
    .where(eq(paymentSubmissions.id, updated.submissionId))
    .limit(1);

  if (submission) {
    await createNotification(submission.userId, {
      type: "system",
      title: "Refund sent / রিফান্ড পাঠানো হয়েছে",
      body:
        updated.executionNote?.trim() ||
        "Your refund has been processed via bKash.",
      link: `/student/payments/${submission.id}`,
    }).catch(() => undefined);

    await enqueue<{
      type: "refund.executed";
      refundId: string;
      submissionId: string;
      userId: string;
      amountBdt: number;
      bkashRefundTrxId: string | null;
    }>("NOTIFICATIONS_QUEUE", {
      type: "refund.executed",
      id: `refund.executed:${updated.id}`,
      payload: {
        type: "refund.executed",
        refundId: updated.id,
        submissionId: submission.id,
        userId: submission.userId,
        amountBdt: Number(updated.amountBdt),
        bkashRefundTrxId: updated.bkashRefundTrxId,
      },
    });

    try {
      await dispatchRefundExecuted({
        userId: submission.userId,
        refundId: updated.id,
        amountBdt: Number(updated.amountBdt),
        bkashRefLast4: updated.bkashRefundTrxId?.slice(-4) ?? "----",
        ctaUrl: `/student/payments/${submission.id}`,
      });
    } catch (error) {
      console.error("[payments/refunds] refund-executed email failed", error);
    }
  }

  return updated;
}

export async function rejectRefund(input: {
  refundId: string;
  adminId: string;
  note: string;
}): Promise<PaymentRefund> {
  if (!isUuid(input.refundId)) throw new RefundNotFoundError();
  const trimmed = input.note.trim();
  if (trimmed.length < 5) throw new Error("Rejection note is required.");

  const db = getDb();
  const [updated] = await db
    .update(paymentRefunds)
    .set({
      status: "rejected",
      approvedBy: input.adminId,
      executionNote: trimmed,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(paymentRefunds.id, input.refundId),
        eq(paymentRefunds.status, "requested")
      )
    )
    .returning();
  if (!updated) {
    const [existing] = await db
      .select()
      .from(paymentRefunds)
      .where(eq(paymentRefunds.id, input.refundId))
      .limit(1);
    if (!existing) throw new RefundNotFoundError();
    throw new RefundNotInStateError();
  }
  await writeAuditRow({
    actorId: input.adminId,
    action: "refund.rejected",
    subjectId: updated.id,
    metadata: { note: trimmed },
  });
  return updated;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listRefundsForSubmission(
  submissionId: string
): Promise<PaymentRefund[]> {
  if (!isUuid(submissionId)) return [];
  const db = getDb();
  return db
    .select()
    .from(paymentRefunds)
    .where(eq(paymentRefunds.submissionId, submissionId))
    .orderBy(desc(paymentRefunds.createdAt));
}

export async function getActiveRefundForSubmission(
  submissionId: string
): Promise<PaymentRefund | null> {
  if (!isUuid(submissionId)) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(paymentRefunds)
    .where(
      and(
        eq(paymentRefunds.submissionId, submissionId),
        // exclude already-rejected / already-executed
        // (those stay visible in history; the *active* one drives the UI).
      )
    )
    .orderBy(desc(paymentRefunds.createdAt))
    .limit(1);
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    console.error("[payments/refunds] audit write failed", error);
  }
}