"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin, requireUser } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";
import { rateLimit } from "@/services/security/rate-limit";
import {
  approveSubmission,
  createSubmission,
  DuplicateSubmissionError,
  InvalidLast4Error,
  InvalidTrxIdError,
  NumberInactiveError,
  RejectionNoteRequiredError,
  rejectSubmission,
  ScopeNotFoundError,
  ScopeNotPurchasableError,
  startReview,
  SubmissionAmountMismatchError,
  SubmissionNotDecidableError,
  SubmissionNotFoundError,
} from "@/services/payments";

const createSchema = z.object({
  numberId: z.string().uuid(),
  scopeKind: z.enum(["bundle", "course"]),
  scopeId: z.string().uuid(),
  amountBdt: z.number().positive().max(1_000_000),
  trxId: z.string().min(8).max(40),
  senderLast4: z.string().regex(/^\d{4}$/),
  senderName: z.string().max(120).optional().nullable(),
  payerNote: z.string().max(500).optional().nullable(),
  whatsappSent: z.boolean().optional(),
  screenshotKey: z.string().max(200).optional().nullable(),
});

export interface SubmissionActionResult {
  success: boolean;
  submissionId?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Student-initiated: create a new payment_submissions row.
 *
 * Rate-limited via `payments.create` (5 / 60 min / user) per phase doc §5.
 * The unique dedupe index on (user, scope, 10-min bucket) backs us up if a
 * double-tap slips through.
 */
export async function createPaymentSubmissionAction(
  raw: unknown
): Promise<SubmissionActionResult> {
  const user = await requireUser();
  const t = await getTranslator();

  const rl = await rateLimit("payments.create", user.id);
  if (!rl.ok) {
    return {
      success: false,
      error: t("system.rateLimited"),
    };
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
    };
  }

  try {
    const { submission, expiresAt } = await createSubmission({
      userId: user.id,
      ...parsed.data,
    });
    revalidatePath("/student/payments");
    return {
      success: true,
      submissionId: submission.id,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    if (
      error instanceof InvalidTrxIdError ||
      error instanceof InvalidLast4Error ||
      error instanceof NumberInactiveError ||
      error instanceof ScopeNotPurchasableError ||
      error instanceof ScopeNotFoundError ||
      error instanceof DuplicateSubmissionError ||
      error instanceof SubmissionAmountMismatchError
    ) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to submit payment.",
    };
  }
}

const startReviewSchema = z.object({ submissionId: z.string().uuid() });

export async function startPaymentReviewAction(
  raw: unknown
): Promise<SubmissionActionResult> {
  const admin = await requireAdmin();
  const t = await getTranslator();
  const parsed = startReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
    };
  }
  try {
    await startReview(parsed.data.submissionId, admin.id);
    revalidatePath(`/admin/payments`);
    revalidatePath(`/admin/payments/${parsed.data.submissionId}`);
    return { success: true, submissionId: parsed.data.submissionId };
  } catch (error) {
    if (
      error instanceof SubmissionNotFoundError ||
      error instanceof SubmissionNotDecidableError
    ) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to claim review.",
    };
  }
}

const approveSchema = z.object({
  submissionId: z.string().uuid(),
  reviewNote: z.string().max(500).optional().nullable(),
});

export async function approvePaymentSubmissionAction(
  raw: unknown
): Promise<SubmissionActionResult & { receiptNumber?: string }> {
  const admin = await requireAdmin();
  const t = await getTranslator();
  const parsed = approveSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
    };
  }
  try {
    const { submission, receiptNumber } = await approveSubmission(
      parsed.data.submissionId,
      admin.id,
      parsed.data.reviewNote ?? null
    );
    revalidatePath("/admin/payments");
    revalidatePath("/admin");
    revalidatePath("/student/payments");
    return {
      success: true,
      submissionId: submission.id,
      receiptNumber,
    };
  } catch (error) {
    if (
      error instanceof SubmissionNotFoundError ||
      error instanceof SubmissionNotDecidableError
    ) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to approve payment.",
    };
  }
}

const rejectSchema = z.object({
  submissionId: z.string().uuid(),
  reviewNote: z.string().min(10).max(500),
});

export async function rejectPaymentSubmissionAction(
  raw: unknown
): Promise<SubmissionActionResult> {
  const admin = await requireAdmin();
  const t = await getTranslator();
  const parsed = rejectSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: localizeMessage("Validation failed. Please check the form errors.", t),
    };
  }
  try {
    const updated = await rejectSubmission(
      parsed.data.submissionId,
      admin.id,
      parsed.data.reviewNote
    );
    revalidatePath("/admin/payments");
    revalidatePath(`/admin/payments/${parsed.data.submissionId}`);
    return { success: true, submissionId: updated.id };
  } catch (error) {
    if (
      error instanceof RejectionNoteRequiredError ||
      error instanceof SubmissionNotFoundError ||
      error instanceof SubmissionNotDecidableError
    ) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reject payment.",
    };
  }
}
