/**
 * R6 — admin-managed bKash receiving numbers.
 *
 * The student-facing checkout only ever reads `listActiveNumbers()` (cached
 * at the edge with `Cache-Control: public, max-age=60`). Admins see the
 * full set incl. disabled rows via `listAllNumbers()`. Every mutating
 * function writes an audit row so the operator can reconstruct the history
 * of who changed what when — see docs/remaster-phase-6-payments.md §3.1.
 */

import "server-only";
import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  paymentNumbers,
  paymentNumbersAudit,
  type NewPaymentNumber,
  type PaymentNumber,
} from "@/db/schema";
import {
  BKASH_INTL_RE,
  BKASH_LOCAL_RE,
} from "@/services/payments/constants";
import { isUuid } from "@/lib/utils";

/**
 * Strip non-digits and re-validate. The student typing
 * `+880 (171) 234 5678` collapses to `8801712345678`; we then either
 * accept as international or as local with `01` prefix.
 */
export function normalizeBkashNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (BKASH_LOCAL_RE.test(digits) || BKASH_INTL_RE.test(digits)) return digits;
  return null;
}

/**
 * Student-facing list: only `status='active'` rows. The route handler that
 * calls this is expected to attach the edge-cache headers
 * (`Cache-Control: public, max-age=60`) per the phase doc §3.1.
 */
export async function listActiveNumbers(): Promise<PaymentNumber[]> {
  const db = getDb();
  return db
    .select()
    .from(paymentNumbers)
    .where(eq(paymentNumbers.status, "active"))
    .orderBy(desc(paymentNumbers.createdAt));
}

/** Admin-only list including disabled rows. */
export async function listAllNumbers(): Promise<PaymentNumber[]> {
  const db = getDb();
  return db
    .select()
    .from(paymentNumbers)
    .orderBy(desc(paymentNumbers.createdAt));
}

/** Single row by id (admin-only paths). */
export async function getNumberById(id: string): Promise<PaymentNumber | null> {
  if (!isUuid(id)) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(paymentNumbers)
    .where(eq(paymentNumbers.id, id))
    .limit(1);
  return row ?? null;
}

export interface CreateNumberInput {
  label: string;
  bkashNumber: string;
  holderName: string;
  instructions?: string;
  whatsappNumber?: string;
  whatsappTemplate?: string;
}

export class InvalidBkashNumberError extends Error {
  constructor() {
    super(
      "Invalid bKash number. Expected an 11-digit local (01XXXXXXXXX) or international (8801XXXXXXXXX) number."
    );
  }
}

export class NumberNotFoundError extends Error {
  constructor() {
    super("Payment number not found.");
  }
}

/**
 * Create a new bKash receiving number. Validates the number shape, then
 * inserts the row + an audit row with `action='created'`.
 */
export async function createNumber(
  input: CreateNumberInput,
  actorId: string
): Promise<PaymentNumber> {
  const normalized = normalizeBkashNumber(input.bkashNumber);
  if (!normalized) throw new InvalidBkashNumberError();
  if (!input.label.trim()) {
    throw new Error("Label is required.");
  }
  if (!input.holderName.trim()) {
    throw new Error("Holder name is required.");
  }

  const db = getDb();
  const insert: NewPaymentNumber = {
    label: input.label.trim(),
    bkashNumber: normalized,
    holderName: input.holderName.trim(),
    instructions: (input.instructions ?? "").trim(),
    whatsappNumber: input.whatsappNumber?.trim() || null,
    whatsappTemplate: input.whatsappTemplate?.trim() || null,
    status: "active",
    createdBy: actorId,
  };

  const [row] = await db
    .insert(paymentNumbers)
    .values(insert)
    .returning();

  if (!row) throw new Error("Failed to create payment number.");

  await writeAudit(row.id, actorId, "created", null, {
    label: row.label,
    bkashNumber: row.bkashNumber,
    holderName: row.holderName,
    instructions: row.instructions,
    whatsappNumber: row.whatsappNumber,
    whatsappTemplate: row.whatsappTemplate,
    status: row.status,
  });

  return row;
}

export interface UpdateNumberInput {
  label?: string;
  bkashNumber?: string;
  holderName?: string;
  instructions?: string;
  whatsappNumber?: string | null;
  whatsappTemplate?: string | null;
}

/**
 * Patch an existing number. Validates the bKash number if provided, then
 * writes an audit row containing the before / after diff.
 */
export async function updateNumber(
  id: string,
  patch: UpdateNumberInput,
  actorId: string
): Promise<PaymentNumber> {
  const db = getDb();
  const existing = await getNumberById(id);
  if (!existing) throw new NumberNotFoundError();

  const next: Partial<NewPaymentNumber> = {};
  if (patch.label !== undefined) next.label = patch.label.trim();
  if (patch.holderName !== undefined) next.holderName = patch.holderName.trim();
  if (patch.instructions !== undefined) {
    next.instructions = patch.instructions.trim();
  }
  if (patch.whatsappNumber !== undefined) {
    next.whatsappNumber = patch.whatsappNumber?.trim() || null;
  }
  if (patch.whatsappTemplate !== undefined) {
    next.whatsappTemplate = patch.whatsappTemplate?.trim() || null;
  }
  if (patch.bkashNumber !== undefined) {
    const normalized = normalizeBkashNumber(patch.bkashNumber);
    if (!normalized) throw new InvalidBkashNumberError();
    next.bkashNumber = normalized;
  }
  next.updatedAt = new Date();

  const [updated] = await db
    .update(paymentNumbers)
    .set(next)
    .where(eq(paymentNumbers.id, id))
    .returning();

  if (!updated) throw new NumberNotFoundError();

  await writeAudit(id, actorId, "edited", rowSnapshot(existing), {
    label: updated.label,
    bkashNumber: updated.bkashNumber,
    holderName: updated.holderName,
    instructions: updated.instructions,
    whatsappNumber: updated.whatsappNumber,
    whatsappTemplate: updated.whatsappTemplate,
    status: updated.status,
  });

  return updated;
}

/**
 * Soft-disable a number (`status='disabled'`) or re-enable it. Students
 * stop seeing disabled numbers within the next edge-cache TTL (≤ 60s).
 */
export async function setNumberStatus(
  id: string,
  next: "active" | "disabled",
  actorId: string
): Promise<PaymentNumber> {
  const db = getDb();
  const existing = await getNumberById(id);
  if (!existing) throw new NumberNotFoundError();
  if (existing.status === next) return existing;

  const [updated] = await db
    .update(paymentNumbers)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(paymentNumbers.id, id))
    .returning();

  if (!updated) throw new NumberNotFoundError();

  await writeAudit(
    id,
    actorId,
    next === "disabled" ? "disabled" : "re-enabled",
    { status: existing.status },
    { status: updated.status }
  );

  return updated;
}

/** Audit log for one number, newest first. */
export async function listNumberAudit(
  numberId: string
): Promise<
  Array<{
    id: number;
    actorId: string;
    action: string;
    before: unknown;
    after: unknown;
    createdAt: Date;
  }>
> {
  if (!isUuid(numberId)) return [];
  const db = getDb();
  return db
    .select({
      id: paymentNumbersAudit.id,
      actorId: paymentNumbersAudit.actorId,
      action: paymentNumbersAudit.action,
      before: paymentNumbersAudit.before,
      after: paymentNumbersAudit.after,
      createdAt: paymentNumbersAudit.createdAt,
    })
    .from(paymentNumbersAudit)
    .where(eq(paymentNumbersAudit.numberId, numberId))
    .orderBy(desc(paymentNumbersAudit.createdAt));
}

async function writeAudit(
  numberId: string,
  actorId: string,
  action: "created" | "edited" | "disabled" | "re-enabled",
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): Promise<void> {
  const db = getDb();
  try {
    await db.insert(paymentNumbersAudit).values({
      numberId,
      actorId,
      action,
      before: before ?? null,
      after: after ?? null,
    });
  } catch (error) {
    console.error("[payments/numbers] audit write failed", error);
  }
}

function rowSnapshot(row: PaymentNumber): Record<string, unknown> {
  return {
    label: row.label,
    bkashNumber: row.bkashNumber,
    holderName: row.holderName,
    instructions: row.instructions,
    whatsappNumber: row.whatsappNumber,
    whatsappTemplate: row.whatsappTemplate,
    status: row.status,
  };
}
