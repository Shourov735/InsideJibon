import "server-only";

import { desc, eq, and, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  aiQuizDrafts,
  courseModules,
  courses,
  lessonChunks,
  lessons,
} from "@/db/schema";
import { aiRun } from "@/lib/cloudflare/ai";
import { TUTOR_LLM_MODEL } from "./tutor";
import { consumeTutorSlot } from "./rate-limit";
import { getBudgetState, recordNeuronUsage } from "./budget-guard";
import { assertAnswerInContext, isAllowedQuestion } from "./safety";

/**
 * R8 §3.6 — Teacher-side AI quiz generator.
 *
 * Pulls the indexed caption chunks for a lesson and asks the LLM to
 * produce N multiple-choice questions. The result is persisted as an
 * `ai_quiz_drafts` row (status='draft') and returned to the teacher
 * editor, where they edit / publish.
 *
 * Rate limit: teachers share the `ai.tutor.ask` KV bucket — 30 hits/day
 * total per teacher for quiz generation. We use the same
 * `consumeTutorSlot` helper (20 limit) but cap at 30/day via a separate
 * counter. Implementation: reuse the daily counter; the cap is
 * enforced by the KV bucket — quiz gen runs out of the same 20
 * hits/min bucket. For the daily cap we just enforce "drafts per day
 * <= 30" in the SQL.
 */

export type QuizQuestion = {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type GeneratedQuiz = {
  questions: QuizQuestion[];
};

export type GenerateQuizInput = {
  courseId: string;
  lessonId?: string | null;
  teacherId: string;
  count?: number;
};

export const QUIZ_DAILY_LIMIT = 30;
const NEURONS_PER_QUIZ_GEN = 800;

export type GenerateQuizError =
  | { kind: "forbidden" }
  | { kind: "rate_limited"; reason: string }
  | { kind: "budget"; resetSec: number }
  | { kind: "no_chunks" }
  | { kind: "parse_failed"; message: string };

export async function generateQuiz(
  input: GenerateQuizInput
): Promise<
  { ok: true; draftId: string; quiz: GeneratedQuiz } | { ok: false; error: GenerateQuizError }
> {
  const count = clampCount(input.count ?? 5);

  // 1. Authorization: teacher must own the course.
  const db = getDb();
  const [course] = await db
    .select({ teacherId: courses.teacherId })
    .from(courses)
    .where(eq(courses.id, input.courseId))
    .limit(1);
  if (!course || course.teacherId !== input.teacherId) {
    return { ok: false, error: { kind: "forbidden" } };
  }

  // 2. Budget guard.
  const budget = await getBudgetState();
  if (!budget.available) {
    return {
      ok: false,
      error: {
        kind: "budget",
        resetSec: budget.resetSec,
      },
    };
  }

  // 3. Daily counter — teachers get 30/day. Reuse the same atomic
  //    upsert path as the tutor but enforce a different ceiling via a
  //    lightweight check before we consume the slot.
  const todaysCount = await countTodayDrafts(input.teacherId);
  if (todaysCount >= QUIZ_DAILY_LIMIT) {
    return {
      ok: false,
      error: { kind: "rate_limited", reason: "daily" },
    };
  }

  // Burst + increment.
  const slot = await consumeTutorSlot(input.teacherId);
  if (!slot.ok) {
    return { ok: false, error: { kind: "rate_limited", reason: slot.reason ?? "burst" } };
  }

  // 4. Fetch lesson chunks.
  const where = input.lessonId
    ? and(
        eq(lessonChunks.lessonId, input.lessonId),
        eq(lessonChunks.sourceKind, "youtube_caption")
      )
    : sql`${lessonChunks.lessonId} IN (
        SELECT id FROM ${lessons} l
        INNER JOIN ${courseModules} m ON m.id = l.module_id
        WHERE m.course_id = ${input.courseId}
      ) AND ${lessonChunks.sourceKind} = 'youtube_caption'`;
  const chunkRows = await db
    .select({
      text: lessonChunks.text,
      chunkIndex: lessonChunks.chunkIndex,
      lessonId: lessonChunks.lessonId,
    })
    .from(lessonChunks)
    .where(where)
    .orderBy(lessonChunks.lessonId, lessonChunks.chunkIndex)
    .limit(40);
  if (chunkRows.length === 0) {
    return { ok: false, error: { kind: "no_chunks" } };
  }

  // 5. Prompt.
  const context = chunkRows
    .map((r, i) => `[${i + 1}] ${r.text.slice(0, 400)}`)
    .join("\n");
  const systemPrompt =
    "You generate multiple-choice questions from lesson notes. Output ONLY valid JSON matching the schema: { questions: [{ text, options: [string x4], correctIndex: 0|1|2|3, explanation }] }. Do not include any text outside the JSON. Each option must be plausible; only one is correct.";
  const userPrompt = [
    `<context>${context}</context>`,
    `Generate ${count} multiple-choice questions that a high-school student in Bangladesh could answer using the notes above.`,
  ].join("\n");

  const resp = await aiRun(TUTOR_LLM_MODEL, {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  const text = extractJsonText(resp);
  if (!text) {
    return {
      ok: false,
      error: { kind: "parse_failed", message: "empty response" },
    };
  }
  const parsed = safeParse(text);
  if (!parsed) {
    return {
      ok: false,
      error: { kind: "parse_failed", message: "invalid JSON shape" },
    };
  }

  // 6. Persist draft.
  const [draft] = await db
    .insert(aiQuizDrafts)
    .values({
      courseId: input.courseId,
      lessonId: input.lessonId ?? null,
      teacherId: input.teacherId,
      payload: parsed,
      status: "draft",
    })
    .returning({ id: aiQuizDrafts.id });

  await recordNeuronUsage(NEURONS_PER_QUIZ_GEN);

  return {
    ok: true,
    draftId: draft?.id ?? "",
    quiz: parsed,
  };
}

export async function listQuizDrafts(input: {
  teacherId: string;
  courseId?: string | null;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    courseId: string;
    lessonId: string | null;
    payload: GeneratedQuiz;
    status: string;
    createdAt: Date;
  }>
> {
  const db = getDb();
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  const where = input.courseId
    ? and(eq(aiQuizDrafts.teacherId, input.teacherId), eq(aiQuizDrafts.courseId, input.courseId))
    : eq(aiQuizDrafts.teacherId, input.teacherId);
  const rows = await db
    .select({
      id: aiQuizDrafts.id,
      courseId: aiQuizDrafts.courseId,
      lessonId: aiQuizDrafts.lessonId,
      payload: aiQuizDrafts.payload,
      status: aiQuizDrafts.status,
      createdAt: aiQuizDrafts.createdAt,
    })
    .from(aiQuizDrafts)
    .where(where)
    .orderBy(desc(aiQuizDrafts.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    payload: r.payload as GeneratedQuiz,
  }));
}

export async function acceptQuizDraft(input: {
  teacherId: string;
  draftId: string;
}): Promise<{ ok: true } | { ok: false }> {
  const db = getDb();
  // Only the owning teacher can accept; status check enforces ownership
  // + draft state.
  const [draft] = await db
    .update(aiQuizDrafts)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(
      and(
        eq(aiQuizDrafts.id, input.draftId),
        eq(aiQuizDrafts.teacherId, input.teacherId),
        eq(aiQuizDrafts.status, "draft")
      )
    )
    .returning({ id: aiQuizDrafts.id });
  return draft ? { ok: true } : { ok: false };
}

export async function discardQuizDraft(input: {
  teacherId: string;
  draftId: string;
}): Promise<{ ok: true } | { ok: false }> {
  const db = getDb();
  const [draft] = await db
    .update(aiQuizDrafts)
    .set({ status: "discarded" })
    .where(
      and(
        eq(aiQuizDrafts.id, input.draftId),
        eq(aiQuizDrafts.teacherId, input.teacherId),
        eq(aiQuizDrafts.status, "draft")
      )
    )
    .returning({ id: aiQuizDrafts.id });
  return draft ? { ok: true } : { ok: false };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampCount(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.min(10, Math.max(1, Math.floor(n)));
}

async function countTodayDrafts(teacherId: string): Promise<number> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiQuizDrafts)
    .where(
      sql`${aiQuizDrafts.teacherId} = ${teacherId}
          AND ${aiQuizDrafts.createdAt} >= ${today}::date`
    );
  return row?.count ?? 0;
}

function extractJsonText(resp: unknown): string | null {
  if (!resp || typeof resp !== "object") return null;
  const r = resp as { response?: unknown };
  if (typeof r.response === "string") return r.response.trim();
  if (Array.isArray(r.response)) {
    for (const item of r.response) {
      if (item && typeof item === "object" && "message" in (item as Record<string, unknown>)) {
        const m = (item as { message?: { content?: unknown } }).message;
        if (typeof m?.content === "string") return m.content.trim();
      }
    }
    return r.response
      .filter((x): x is string => typeof x === "string")
      .join("")
      .trim();
  }
  return null;
}

function safeParse(text: string): GeneratedQuiz | null {
  // Strip ```json fences that some models add.
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const obj = JSON.parse(cleaned) as { questions?: unknown };
    if (!obj || !Array.isArray(obj.questions)) return null;
    const questions: QuizQuestion[] = [];
    for (const q of obj.questions) {
      if (!q || typeof q !== "object") continue;
      const qq = q as Partial<QuizQuestion>;
      if (
        typeof qq.text !== "string" ||
        !Array.isArray(qq.options) ||
        qq.options.length !== 4 ||
        typeof qq.correctIndex !== "number" ||
        qq.correctIndex < 0 ||
        qq.correctIndex > 3 ||
        typeof qq.explanation !== "string"
      ) {
        continue;
      }
      questions.push({
        text: qq.text,
        options: qq.options.map((o) => String(o)),
        correctIndex: qq.correctIndex,
        explanation: qq.explanation,
      });
    }
    if (questions.length === 0) return null;
    return { questions };
  } catch {
    return null;
  }
}

function extractAssistantText(resp: unknown): string | null {
  // Unused locally; kept for parity with tutor.ts shape.
  void resp;
  return null;
}

// Re-export safety helpers so consumers can import from one place if needed.
export { assertAnswerInContext, isAllowedQuestion };
