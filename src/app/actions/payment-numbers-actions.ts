"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/permissions";
import { getTranslator } from "@/i18n/server";
import { localizeMessage } from "@/i18n/errors";
import {
  createNumber,
  InvalidBkashNumberError,
  listActiveNumbers,
  listAllNumbers,
  listNumberAudit,
  normalizeBkashNumber,
  NumberNotFoundError,
  setNumberStatus,
  updateNumber,
} from "@/services/payments";

const createSchema = z.object({
  label: z.string().min(1).max(120),
  bkashNumber: z.string().min(8).max(40),
  holderName: z.string().min(1).max(120),
  instructions: z.string().max(500).optional().default(""),
  whatsappNumber: z.string().max(40).optional().nullable(),
  whatsappTemplate: z.string().max(500).optional().nullable(),
});

export interface PaymentNumberActionResult {
  success: boolean;
  error?: string;
}

export async function createPaymentNumberAction(
  raw: unknown
): Promise<PaymentNumberActionResult> {
  const admin = await requireAdmin();
  const t = await getTranslator();
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: localizeMessage("Validation failed. Please check the form errors.", t) };
  }
  try {
    await createNumber(
      {
        ...parsed.data,
        whatsappNumber: parsed.data.whatsappNumber ?? undefined,
        whatsappTemplate: parsed.data.whatsappTemplate ?? undefined,
      },
      admin.id
    );
    revalidatePath("/admin/settings/payments");
    revalidatePath("/checkout");
    return { success: true };
  } catch (error) {
    if (error instanceof InvalidBkashNumberError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create bKash number.",
    };
  }
}

const updateSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(120).optional(),
  bkashNumber: z.string().min(8).max(40).optional(),
  holderName: z.string().min(1).max(120).optional(),
  instructions: z.string().max(500).optional(),
  whatsappNumber: z.string().max(40).nullable().optional(),
  whatsappTemplate: z.string().max(500).nullable().optional(),
});

export async function updatePaymentNumberAction(
  raw: unknown
): Promise<PaymentNumberActionResult> {
  const admin = await requireAdmin();
  const t = await getTranslator();
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: localizeMessage("Validation failed. Please check the form errors.", t) };
  }
  try {
    await updateNumber(parsed.data.id, parsed.data, admin.id);
    revalidatePath("/admin/settings/payments");
    return { success: true };
  } catch (error) {
    if (
      error instanceof InvalidBkashNumberError ||
      error instanceof NumberNotFoundError
    ) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update bKash number.",
    };
  }
}

const setStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "disabled"]),
});

export async function setPaymentNumberStatusAction(
  raw: unknown
): Promise<PaymentNumberActionResult> {
  const admin = await requireAdmin();
  const t = await getTranslator();
  const parsed = setStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: localizeMessage("Validation failed. Please check the form errors.", t) };
  }
  try {
    await setNumberStatus(parsed.data.id, parsed.data.status, admin.id);
    revalidatePath("/admin/settings/payments");
    return { success: true };
  } catch (error) {
    if (error instanceof NumberNotFoundError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update number status.",
    };
  }
}

/**
 * Student-facing: returns active numbers only. The route handler attaches
 * `Cache-Control: public, max-age=60` so all students see the same list
 * until an admin add/disable propagates within the TTL window.
 */
export async function getActivePaymentNumbersAction(): Promise<
  Array<{
    id: string;
    label: string;
    bkashNumber: string;
    holderName: string;
    instructions: string;
    whatsappNumber: string | null;
    whatsappTemplate: string | null;
  }>
> {
  const rows = await listActiveNumbers();
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    bkashNumber: r.bkashNumber,
    holderName: r.holderName,
    instructions: r.instructions,
    whatsappNumber: r.whatsappNumber,
    whatsappTemplate: r.whatsappTemplate,
  }));
}

type AdminPaymentNumberRow = {
  id: string;
  label: string;
  bkashNumber: string;
  holderName: string;
  instructions: string;
  whatsappNumber: string | null;
  whatsappTemplate: string | null;
  status: "active" | "disabled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** Admin-only: list every number including disabled rows. */
export async function listAllPaymentNumbersAction(): Promise<AdminPaymentNumberRow[]> {
  await requireAdmin();
  const rows = await listAllNumbers();
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    bkashNumber: r.bkashNumber,
    holderName: r.holderName,
    instructions: r.instructions,
    whatsappNumber: r.whatsappNumber,
    whatsappTemplate: r.whatsappTemplate,
    status: r.status as "active" | "disabled",
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getPaymentNumberAuditAction(raw: unknown): Promise<
  Array<{
    id: number;
    actorId: string;
    action: string;
    before: unknown;
    after: unknown;
    createdAt: string;
  }>
> {
  await requireAdmin();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(raw);
  if (!parsed.success) return [];
  const rows = await listNumberAudit(parsed.data.id);
  return rows.map((r) => ({
    id: r.id,
    actorId: r.actorId,
    action: r.action,
    before: r.before,
    after: r.after,
    createdAt: r.createdAt.toISOString(),
  }));
}

// Helpers exported for the route handlers' zod schemas.
export { normalizeBkashNumber };
