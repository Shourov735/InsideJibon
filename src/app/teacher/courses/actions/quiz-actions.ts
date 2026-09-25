"use server";

import { z } from "zod";

import { requireTeacher } from "@/lib/permissions";
import {
  acceptQuizDraft,
  discardQuizDraft,
  generateQuiz,
  listQuizDrafts,
  type GeneratedQuiz,
} from "@/services/ai/quiz-generator";

/**
 * R8 §3.6 + §4.2 — Teacher-side AI quiz generator server actions.
 *
 * Teacher auth is enforced via `requireTeacher()`. The course-level
 * ownership check lives inside `generateQuiz()` so the UI doesn't
 * need to know the user's id twice. All actions return a discriminated
 * union so the client can localize error messages.
 */

const generateSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid().optional().nullable(),
  count: z.number().int().min(1).max(10).optional(),
});

export type GenerateQuizActionResult =
  | { ok: true; draftId: string; quiz: GeneratedQuiz }
  | {
      ok: false;
      kind:
        | "forbidden"
        | "rate_limited"
        | "budget"
        | "no_chunks"
        | "parse_failed"
        | "binding_missing";
      message?: string;
    };

export async function generateQuizAction(
  input: z.input<typeof generateSchema>
): Promise<GenerateQuizActionResult> {
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, kind: "parse_failed", message: "invalid input" };
  }
  const teacher = await requireTeacher();
  const result = await generateQuiz({
    courseId: parsed.data.courseId,
    lessonId: parsed.data.lessonId ?? null,
    teacherId: teacher.id,
    count: parsed.data.count ?? 5,
  });
  if (!result.ok) {
    return {
      ok: false,
      kind: result.error.kind,
      message: "message" in result.error ? result.error.message : undefined,
    };
  }
  return { ok: true, draftId: result.draftId, quiz: result.quiz };
}

const draftSchema = z.object({
  draftId: z.string().uuid(),
});

export async function acceptQuizDraftAction(
  input: z.input<typeof draftSchema>
): Promise<{ ok: boolean }> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const teacher = await requireTeacher();
  return acceptQuizDraft({ teacherId: teacher.id, draftId: parsed.data.draftId });
}

export async function discardQuizDraftAction(
  input: z.input<typeof draftSchema>
): Promise<{ ok: boolean }> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const teacher = await requireTeacher();
  return discardQuizDraft({
    teacherId: teacher.id,
    draftId: parsed.data.draftId,
  });
}

const listSchema = z.object({
  courseId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export async function listQuizDraftsAction(
  input: z.input<typeof listSchema>
): Promise<{
  ok: true;
  drafts: Awaited<ReturnType<typeof listQuizDrafts>>;
} | { ok: false; error: string }> {
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const teacher = await requireTeacher();
  const drafts = await listQuizDrafts({
    teacherId: teacher.id,
    courseId: parsed.data.courseId ?? null,
    limit: parsed.data.limit ?? 10,
  });
  return { ok: true, drafts };
}
