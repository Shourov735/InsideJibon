"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin, requireUser } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";
import {
  approveRefund,
  markRefundExecuted,
  rejectRefund,
  requestRefund,
} from "@/services/payments";

export interface RefundActionResult {
  success: boolean;
  error?: string;
}

const requestSchema = z.object({
  submissionId: z.string().uuid(),
  reason: z.string().min(5).max(500),
});

export async function requestPaymentRefundAction(
  raw: unknown
): Promise<RefundActionResult> {
  const user = await requireUser();
  const t = await getTranslator();
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: localizeMessage("Validation failed. Please check the form errors.", t) };
  }
  try {
    await requestRefund({ userId: user.id, ...parsed.data });
    revalidatePath(`/student/payments/${parsed.data.submissionId}`);
    revalidatePath("/admin/payments");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to request refund.",
    };
  }
}

const adminIdSchema = z.object({ refundId: z.string().uuid() });

export async function approvePaymentRefundAction(
  raw: unknown
): Promise<RefundActionResult> {
  const admin = await requireAdmin();
  const t = await getTranslator();
  const parsed = adminIdSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: localizeMessage("Validation failed. Please check the form errors.", t) };
  }
  try {
    await approveRefund({ refundId: parsed.data.refundId, adminId: admin.id });
    revalidatePath("/admin/payments");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve refund.",
    };
  }
}

const executeSchema = z.object({
  refundId: z.string().uuid(),
  executionNote: z.string().max(500).optional().nullable(),
  bkashRefundTrxId: z.string().min(8).max(40),
});

export async function executePaymentRefundAction(
  raw: unknown
): Promise<RefundActionResult> {
  const admin = await requireAdmin();
  const t = await getTranslator();
  const parsed = executeSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: localizeMessage("Validation failed. Please check the form errors.", t) };
  }
  try {
    await markRefundExecuted({
      refundId: parsed.data.refundId,
      adminId: admin.id,
      executionNote: parsed.data.executionNote ?? undefined,
      bkashRefundTrxId: parsed.data.bkashRefundTrxId,
    });
    revalidatePath("/admin/payments");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record refund execution.",
    };
  }
}

const rejectSchema = z.object({
  refundId: z.string().uuid(),
  note: z.string().min(5).max(500),
});

export async function rejectPaymentRefundAction(
  raw: unknown
): Promise<RefundActionResult> {
  const admin = await requireAdmin();
  const t = await getTranslator();
  const parsed = rejectSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: localizeMessage("Validation failed. Please check the form errors.", t) };
  }
  try {
    await rejectRefund({
      refundId: parsed.data.refundId,
      adminId: admin.id,
      note: parsed.data.note,
    });
    revalidatePath("/admin/payments");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reject refund.",
    };
  }
}