import type { ZodError, ZodIssue } from "zod";

import type { Locale } from "@/i18n/config";
import type { Translator } from "@/i18n/core";

/**
 * R10 — Localized zod-error mapper.
 *
 * Maps every zod issue into a `validation.*` dictionary key. Falls back
 * to the issue's `message` field if the key is missing. This is the
 * single point that lets every form surface localized errors without
 * each form re-implementing the mapping.
 *
 * Keep the mapping table small and stable — new zod error codes should
 * add a single row here, not be scattered across forms.
 */

const KEY_BY_CODE: Record<string, string> = {
  invalid_type: "validation.invalidType",
  too_small: "validation.tooSmall",
  too_big: "validation.tooBig",
  invalid_string: "validation.invalidString",
  invalid_enum_value: "validation.invalidEnumValue",
  unrecognized_keys: "validation.unrecognizedKeys",
  invalid_arguments: "validation.invalidArguments",
  invalid_return_type: "validation.invalidReturnType",
  invalid_date: "validation.invalidDate",
  invalid_literal: "validation.invalidLiteral",
  custom: "validation.custom",
  not_multiple_of: "validation.notMultipleOf",
  invalid_union: "validation.invalidUnion",
  invalid_union_discriminator: "validation.invalidUnionDiscriminator",
  invalid_intersection_types: "validation.invalidIntersectionTypes",
  not_finite: "validation.notFinite",
};

export type LocalizedIssue = {
  path: string;
  code: string;
  message: string;
};

export function localizeZodIssue(
  issue: ZodIssue,
  t: Translator
): LocalizedIssue {
  const key = KEY_BY_CODE[issue.code];
  const messageKey = key ? t(key as never) : null;
  // Some codes (too_small/too_big) carry a `minimum`/`maximum` we can
  // pass through. We pull whichever numeric limit the issue has.
  const limit =
    "minimum" in issue
      ? (issue as { minimum?: number | bigint }).minimum
      : "maximum" in issue
        ? (issue as { maximum?: number | bigint }).maximum
        : undefined;
  const fallback = messageKey && messageKey !== key ? messageKey : null;
  return {
    path: issue.path.join(".") || "(root)",
    code: issue.code,
    message:
      fallback ??
      (limit !== undefined && messageKey
        ? `${messageKey}: ${String(limit)}`
        : messageKey ?? issue.message),
  };
}

export function localizeZodError(
  error: ZodError,
  _locale?: Locale
): LocalizedIssue[] {
  // The translator is required by callers — but we want the function to
  // be easy to call from a server context where it might be inlined.
  // To keep the API tight we accept an optional translator injected
  // by a sibling helper `localizeZodErrorWith`.
  void _locale;
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    code: issue.code,
    message: issue.message,
  }));
}

export function localizeZodErrorWith(
  error: ZodError,
  t: Translator
): LocalizedIssue[] {
  return error.issues.map((issue) => localizeZodIssue(issue, t));
}
