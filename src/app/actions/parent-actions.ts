"use server";

import { z } from "zod";

import { defineServerAction } from "@/lib/server-action";
import {
  acceptLink,
  revokeLink,
  requestLink,
  type RequestLinkResult,
} from "@/services/parent/links";
import { canReadStudent } from "@/services/parent/access-control";
import { setDigestPreference } from "@/services/parent/digest-prefs";

/**
 * R7 — Server Actions for parent ↔ student link management.
 *
 * `defineServerAction` enforces:
 *   - the caller is authenticated (Clerk),
 *   - the input is zod-validated at the trust boundary,
 *   - any thrown Error is i18n-localized on the response side.
 *
 * Authorization beyond authentication is enforced inside the service
 * layer (`requireUser` only proves the parent role); the services
 * confirm a parent can only operate on their own links, a student
 * only on links where they are the student, and never allow a write
 * against student data (parents have READ-only access).
 */

const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email()
  .transform((v) => v.toLowerCase());

const requestLinkSchema = z.object({
  studentEmail: emailSchema,
});

export interface RequestLinkActionResult {
  outcome: RequestLinkResult["outcome"] | "rate_limited";
  linkId?: string;
  inviteToken?: string;
  messageKey:
    | "parent.invite.outcome.created"
    | "parent.invite.outcome.existingPending"
    | "parent.invite.outcome.alreadyActive"
    | "parent.invite.outcome.unknown"
    | "parent.invite.outcome.rateLimited";
}

export const requestParentLinkAction = defineServerAction({
  role: "parent",
  schema: requestLinkSchema,
  handler: async (input, user): Promise<RequestLinkActionResult> => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://insidejibon.com.bd";
    const result = await requestLink({
      parentId: user.id,
      parentEmail: user.email,
      parentName: user.name,
      studentEmail: input.studentEmail,
      appUrl,
    });
    const messageKey =
      result.outcome === "created"
        ? "parent.invite.outcome.created"
        : result.outcome === "existing-pending"
        ? "parent.invite.outcome.existingPending"
        : result.outcome === "already-active"
        ? "parent.invite.outcome.alreadyActive"
        : "parent.invite.outcome.unknown";
    return {
      outcome: result.outcome,
      linkId: result.linkId,
      inviteToken: result.inviteToken,
      messageKey,
    };
  },
  successToast: (result) => ({
    title: `parent.invite.toast.${result.outcome === "unknown-student" ? "unknown" : "created"}`,
    variant: "success",
  }),
  errorToastKey: "parent.invite.toast.error",
});

const linkIdSchema = z.object({ linkId: z.string().uuid() });

export const revokeParentLinkAction = defineServerAction({
  role: "parent",
  schema: linkIdSchema,
  handler: async (input, user) => {
    await revokeLink({ actorId: user.id, linkId: input.linkId });
    return { linkId: input.linkId };
  },
  successToast: () => ({ title: "parent.link.revoked", variant: "info" }),
  errorToastKey: "parent.link.revokeError",
});

const studentIdSchema = z.object({ studentId: z.string().min(1) });

export const acceptParentLinkAction = defineServerAction({
  role: "student",
  schema: linkIdSchema.extend({ studentId: z.string().min(1).optional() }),
  handler: async (input, user) => {
    const result = await acceptLink({
      studentId: user.id,
      linkId: input.linkId,
    });
    return result;
  },
  successToast: () => ({ title: "parent.link.accepted", variant: "success" }),
  errorToastKey: "parent.link.acceptError",
});

export const studentRevokeParentAction = defineServerAction({
  role: "student",
  schema: linkIdSchema,
  handler: async (input, user) => {
    await revokeLink({ actorId: user.id, linkId: input.linkId });
    return { linkId: input.linkId };
  },
  successToast: () => ({ title: "parent.link.revoked", variant: "info" }),
  errorToastKey: "parent.link.revokeError",
});

const digestPrefsSchema = z.object({
  studentId: z.string().min(1),
  cadence: z.enum(["daily", "weekly", "off"]),
  sendHourUtc: z.number().int().min(0).max(23).optional(),
});

export const setDigestPreferenceAction = defineServerAction({
  role: "parent",
  schema: digestPrefsSchema,
  handler: async (input, user) => {
    // Defense in depth: confirm an active link exists before allowing
    // a digest-preferences write. service-layer check is authoritative.
    const allowed = await canReadStudent(user.id, input.studentId);
    if (!allowed) {
      throw new Error("Forbidden");
    }
    await setDigestPreference({
      parentId: user.id,
      studentId: input.studentId,
      cadence: input.cadence,
      sendHourUtc: input.sendHourUtc ?? 6,
    });
    return { ok: true };
  },
  successToast: () => ({
    title: "parent.settings.cadenceSaved",
    variant: "success",
  }),
  errorToastKey: "parent.settings.cadenceError",
});
