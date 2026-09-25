"use server";

import { z } from "zod";

import { requireUser } from "@/lib/permissions";
import {
  askTutor,
  listTutorHistory,
  readBudget,
  type TutorCitation,
} from "@/services/ai/tutor";

/**
 * R8 §3.5 + §4.1 — Student-facing tutor server action.
 *
 * Single entry point used by the tutor side sheet. Server-side only;
 * all auth, rate-limit, budget, and safety decisions happen inside
 * `askTutor` so the UI can stay thin.
 *
 * NOTE: returns the error structure to the client — never includes
 * PII or internal model details. The UI maps to localized strings.
 */

const askSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid().optional().nullable(),
  question: z.string().min(1).max(800),
  lang: z.enum(["en", "bn"]).optional(),
});

export type AskTutorResult =
  | {
      ok: true;
      answer: string;
      citations: TutorCitation[];
      budgetRemaining: number;
      budgetResetSec: number;
    }
  | {
      ok: false;
      error:
        | { kind: "forbidden"; message: string }
        | { kind: "rate_limited"; remaining: 0; resetSec: number; reason: string }
        | { kind: "budget"; message: string; resetSec: number }
        | { kind: "unsafe"; message: string }
        | { kind: "no_context"; message: string }
        | { kind: "binding_missing"; message: string };
    };

export async function askTutorAction(
  input: z.input<typeof askSchema>
): Promise<AskTutorResult> {
  const parsed = askSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        kind: "unsafe",
        message: "Please ask a question (max 800 characters).",
      },
    };
  }
  const user = await requireUser();
  const result = await askTutor({
    userId: user.id,
    courseId: parsed.data.courseId,
    lessonId: parsed.data.lessonId ?? null,
    question: parsed.data.question,
    lang: parsed.data.lang ?? "en",
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return {
    ok: true,
    answer: result.data.answer,
    citations: result.data.citations,
    budgetRemaining: result.data.budgetRemaining,
    budgetResetSec: result.data.budgetResetSec,
  };
}

const historySchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid().optional().nullable(),
  limit: z.number().int().min(1).max(50).optional(),
});

export async function listTutorHistoryAction(
  input: z.input<typeof historySchema>
): Promise<{
  ok: true;
  messages: Awaited<ReturnType<typeof listTutorHistory>>;
} | { ok: false; error: string }> {
  const parsed = historySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const user = await requireUser();
  const messages = await listTutorHistory({
    userId: user.id,
    courseId: parsed.data.courseId,
    lessonId: parsed.data.lessonId ?? null,
    limit: parsed.data.limit ?? 20,
  });
  return { ok: true, messages };
}

export async function readTutorBudgetAction(): Promise<{
  remaining: number;
  resetSec: number;
}> {
  const user = await requireUser();
  return readBudget(user.id);
}