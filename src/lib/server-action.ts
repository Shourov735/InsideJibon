import "server-only";

import { ZodError, type ZodType } from "zod";

import { getTranslator } from "@/i18n/server";
import type { Translator } from "@/i18n/core";
import { localizeError } from "@/i18n/errors";
import { requireUser } from "@/lib/permissions";
import type { ActionResult, ToastHint } from "@/types/course";
import type { CurrentUser } from "@/lib/auth";
import type { Role } from "@/db/schema";
import type { TranslationKey } from "@/i18n/dictionaries";

/**
 * R1 §7 + §8 — `defineServerAction` helper.
 *
 * Single authoritative entry point for new Server Actions. It:
 *   1. Requires an authenticated user (and optionally a role list)
 *      BEFORE running the handler. Layouts are NOT a security
 *      boundary per AGENTS.md — actions must enforce auth themselves.
 *   2. Validates the input against a zod schema at the trust
 *      boundary and converts parse failures into a localized error.
 *   3. Wraps thrown `Error`s through the i18n error catalog so the
 *      client renders a localized message instead of a raw English
 *      string.
 *
 * Existing actions (pre-R1) bypass this helper. R1 migrates the
 * hottest paths (enroll, exam-publish, role-change) onto the wrapper
 * to demonstrate the pattern without rewriting ~30 files in one
 * commit.
 *
 * Usage:
 *
 *   export const publishExamAction = defineServerAction({
 *     role: "teacher",
 *     schema: publishExamSchema,
 *     handler: async ({ examId }, user) => publishExam(user.id, examId),
 *     successToast: (exam) => ({
 *       title: "Exam published",
 *       variant: "success",
 *     }),
 *   });
 */

export interface DefineServerActionOptions<TInput, TOutput> {
  /** Allowed role(s). Omit to allow any authenticated user. */
  role?: Role | Role[];
  /** Zod schema for the action's input. Optional. */
  schema?: ZodType<TInput>;
  /** Translation key prefix for the success toast (default: 'system.toast.success'). */
  successToastKey?: TranslationKey;
  /** Translation key prefix for the error toast (default: 'system.toast.error'). */
  errorToastKey?: TranslationKey;
  /** Build the success toast from the handler result. */
  successToast?: (output: TOutput) => ToastHint;
  /**
   * The action body. Receives the validated input and the authenticated
   * user. Throw to signal a domain error (will be localized via the
   * i18n error catalog and converted to `success: false`).
   */
  handler: (input: TInput, user: CurrentUser) => Promise<TOutput>;
}

/**
 * Define a Server Action with consistent authorization, validation, and
 * toast-hint wiring. Returns a callable that conforms to the same shape
 * as Next.js Server Actions (`(...args) => Promise<ActionResult<T>>`).
 */
export function defineServerAction<TInput = void, TOutput = void>(
  opts: DefineServerActionOptions<TInput, TOutput>,
): (input: TInput) => Promise<ActionResult<TOutput>> {
  return async function definedAction(input: TInput): Promise<ActionResult<TOutput>> {
    const t = await getTranslator();
    const auth = opts.role ? { roles: Array.isArray(opts.role) ? opts.role : [opts.role] } : {};
    let user: CurrentUser;
    try {
      user = auth.roles
        ? await (await import("@/lib/permissions")).requireRole(...auth.roles)
        : await requireUser();
    } catch (caught) {
      // requireUser/requireRole call `redirect()` (throws a NEXT_REDIRECT).
      // We let those bubble so Next can render the redirect.
      if (isNextRedirect(caught)) throw caught;
      return {
        success: false,
        error: t("system.permissionDenied"),
        toast: {
          title: t(opts.errorToastKey ?? "system.toast.error.title"),
          variant: "error",
        },
      };
    }

    if (opts.schema) {
      const parsed = opts.schema.safeParse(input);
      if (!parsed.success) {
        return {
          success: false,
          error: localizeZodError(parsed.error, t),
          fieldErrors: flattenZodFieldErrors(parsed.error),
          toast: {
            title: t(opts.errorToastKey ?? "system.toast.error.title"),
            variant: "error",
          },
        };
      }
      input = parsed.data;
    }

    try {
      const output = await opts.handler(input, user);
      const toast = opts.successToast?.(output);
      return {
        success: true,
        data: output,
        toast: toast ?? { title: t(opts.successToastKey ?? "system.toast.success.title"), variant: "success" },
      };
    } catch (caught) {
      if (isNextRedirect(caught)) throw caught;
      const message = localizeError(caught, t);
      return {
        success: false,
        error: message,
        toast: {
          title: t(opts.errorToastKey ?? "system.toast.error.title"),
          description: message,
          variant: "error",
        },
      };
    }
  };
}

function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function localizeZodError(err: ZodError, t: Translator): string {
  const issues = err.issues;
  if (issues.length === 0) return t("system.requestError");
  return issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") + ": " : "";
      return path + issue.message;
    })
    .join("; ");
}

function flattenZodFieldErrors(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    if (!key) continue;
    if (!out[key]) out[key] = [];
    out[key].push(issue.message);
  }
  return out;
}
