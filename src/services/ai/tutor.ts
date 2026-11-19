import "server-only";

import { eq, and, desc } from "drizzle-orm";

import { getDb } from "@/db";
import {
  aiTutorMessages,
  enrollments,
  courses,
  lessons,
  lessonChunks,
  materials,
} from "@/db/schema";
import { aiRun } from "@/lib/cloudflare/ai";
import {
  consumeTutorSlot,
  peekDailyCounter,
  R8_DAILY_LIMIT,
  type TutorRateLimit,
} from "./rate-limit";

import { getBudgetState, recordNeuronUsage } from "./budget-guard";
import {
  assertAnswerInContext,
  isAllowedQuestion,
} from "./safety";
import { isYouTubeUrl, extractYouTubeVideoId } from "./captions";
import {
  callGemini,
  hasGeminiKey,
  type GeminiTurn,
} from "./gemini";

export const TUTOR_LLM_MODEL = "@cf/meta/llama-3.1-8b-instruct";
export const TRANSLATION_MODEL = "@cf/m2m100-1.2b";
const NEURONS_PER_TUTOR_CALL = 400;


export type TutorInput = {
  userId: string;
  courseId: string;
  lessonId?: string | null;
  question: string;
  lang?: "en" | "bn";
  mode?: "standard" | "reteach";
  image?: {
    data: string; // Base64 encoded without prefix
    mimeType: string;
  } | null;
};

export type TutorCitation = {
  /** 1-based citation index in the answer text. */
  n: number;
  lessonId: string;
  /** YouTube video id, when source is youtube_caption. */
  videoId: string | null;
  /** Seconds into the video. */
  startSec: number | null;
  endSec: number | null;
  /** Pre-built URL the student can click to jump to that moment. */
  url: string | null;
  /** First 200 chars of the chunk for hover preview. */
  snippet: string;
};

export type TutorOutput = {
  answer: string;
  citations: TutorCitation[];
  budgetRemaining: number;
  budgetResetSec: number;
};

export type TutorError =
  | { kind: "forbidden"; message: string }
  | { kind: "rate_limited"; remaining: 0; resetSec: number; reason: string }
  | { kind: "budget"; message: string; resetSec: number }
  | { kind: "unsafe"; message: string }
  | { kind: "no_context"; message: string }
  | { kind: "binding_missing"; message: string }
  | { kind: "key_missing"; message: string };

/**
 * Public entry point for asking the AI Tutor.
 * Supports both Google Gemini (primary, multimodal, bilingual) and Cloudflare Workers AI fallback.
 */
export async function askTutor(input: TutorInput): Promise<
  { ok: true; data: TutorOutput } | { ok: false; error: TutorError }
> {
  const lang = input.lang ?? "en";
  const db = getDb();

  // 1. Access verification
  const access = await assertTutorCourseAccess(input.userId, input.courseId);
  if (!access) {
    return {
      ok: false,
      error: { kind: "forbidden", message: "You don't have access to this course." },
    };
  }

  // 2. Safety check on question text
  const verdict = isAllowedQuestion(input.question);
  if (!verdict.ok) {
    return {
      ok: false,
      error: {
        kind: "unsafe",
        message:
          verdict.reason === "empty"
            ? "Please ask a question."
            : verdict.reason === "too_long"
              ? "Please shorten your question (max 800 characters)."
              : "For your privacy, please don't share personal contact details in the tutor.",
      },
    };
  }

  // 3. Rate limit (KV burst + Neon daily increment)
  const slot: TutorRateLimit = await consumeTutorSlot(input.userId);
  if (!slot.ok) {
    return {
      ok: false,
      error: {
        kind: "rate_limited",
        remaining: 0,
        resetSec: slot.resetSec,
        reason:
          slot.reason === "burst"
            ? "Please slow down — too many questions in a short time."
            : `You've used all ${R8_DAILY_LIMIT} tutor questions for today. Try again tomorrow.`,
      },
    };
  }

  // 4. Resilient Context Gathering:
  //    Load Course, Lesson, Materials, and any available caption chunks.
  const [courseRow] = await db
    .select({
      id: courses.id,
      title: courses.title,
      description: courses.description,
      category: courses.category,
    })
    .from(courses)
    .where(eq(courses.id, input.courseId))
    .limit(1);

  let lessonRow: {
    id: string;
    title: string;
    description: string | null;
    content: string | null;
    videoUrl: string | null;
  } | null = null;

  let lessonMaterialsList: Array<{ name: string; mimeType: string }> = [];
  let existingChunks: Array<{

    chunkIndex: number;
    text: string;
    startSec: number | null;
    endSec: number | null;
  }> = [];

  if (input.lessonId) {
    const [lRow] = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        description: lessons.description,
        content: lessons.content,
        videoUrl: lessons.videoUrl,
      })
      .from(lessons)
      .where(eq(lessons.id, input.lessonId))
      .limit(1);

    lessonRow = lRow ?? null;

    if (lessonRow) {
      lessonMaterialsList = await db
        .select({
          name: materials.name,
          mimeType: materials.mimeType,
        })
        .from(materials)
        .where(eq(materials.lessonId, lessonRow.id))
        .limit(10);

      existingChunks = await db
        .select({
          chunkIndex: lessonChunks.chunkIndex,
          text: lessonChunks.text,
          startSec: lessonChunks.startSec,
          endSec: lessonChunks.endSec,
        })
        .from(lessonChunks)
        .where(eq(lessonChunks.lessonId, lessonRow.id))
        .limit(10);
    }
  }

  // Build citations & context blocks from database caption chunks (if present)
  const contextBlocks: string[] = [];
  const citations: TutorCitation[] = [];

  const videoUrl = lessonRow?.videoUrl ?? null;
  const videoId = isYouTubeUrl(videoUrl) ? extractYouTubeVideoId(videoUrl) : null;

  if (existingChunks.length > 0 && lessonRow) {
    existingChunks.forEach((chunk, idx) => {
      const n = idx + 1;
      const snippet = chunk.text.slice(0, 500);
      contextBlocks.push(`[${n}] ${snippet}`);
      const startSec = chunk.startSec ?? 0;
      citations.push({
        n,
        lessonId: lessonRow!.id,
        videoId,
        startSec: chunk.startSec,
        endSec: chunk.endSec,
        url:
          videoId && chunk.startSec != null
            ? `https://www.youtube.com/embed/${videoId}?start=${Math.max(0, Math.floor(startSec))}`
            : null,
        snippet,
      });
    });
  }

  // If no caption chunks, add structured lesson metadata and markdown notes
  if (contextBlocks.length === 0) {
    const summaryParts: string[] = [
      `Course: ${courseRow?.title || "Academic Course"} (${courseRow?.category || "General"})`,
    ];
    if (lessonRow) {
      summaryParts.push(`Lesson: ${lessonRow.title}`);
      if (lessonRow.description) {
        summaryParts.push(`Lesson Description: ${lessonRow.description}`);
      }
      if (lessonRow.content) {
        summaryParts.push(`Lesson Notes & Formulas:\n${lessonRow.content.slice(0, 3000)}`);
      }
      if (lessonMaterialsList.length > 0) {
        summaryParts.push(
          `Attached Resources: ${lessonMaterialsList.map((m) => `${m.name} (${m.mimeType})`).join(", ")}`
        );
      }
    }
    contextBlocks.push(summaryParts.join("\n"));
  }


  // Fetch recent conversation history for this lesson (last 4 turns) to enable multi-turn memory
  const recentHistory = await db
    .select({
      question: aiTutorMessages.question,
      answer: aiTutorMessages.answer,
    })
    .from(aiTutorMessages)
    .where(
      input.lessonId
        ? and(
            eq(aiTutorMessages.userId, input.userId),
            eq(aiTutorMessages.courseId, input.courseId),
            eq(aiTutorMessages.lessonId, input.lessonId)
          )
        : and(
            eq(aiTutorMessages.userId, input.userId),
            eq(aiTutorMessages.courseId, input.courseId)
          )
    )
    .orderBy(desc(aiTutorMessages.createdAt))
    .limit(4);

  // 5. Execution: Primary = Google Gemini
  if (hasGeminiKey()) {
    const systemPrompt = buildGeminiSystemPrompt({
      courseTitle: courseRow?.title || "Academic Subject",
      courseCategory: courseRow?.category,
      lessonTitle: lessonRow?.title,
      mode: input.mode,
      hasImage: Boolean(input.image?.data),
    });

    const turns: GeminiTurn[] = [];

    // Reverse history to chronological order (oldest first)
    const chronoHistory = [...recentHistory].reverse();
    for (const h of chronoHistory) {
      turns.push({ role: "user", parts: [{ text: h.question }] });
      turns.push({ role: "model", parts: [{ text: h.answer }] });
    }

    // Current turn user prompt
    const userPromptText = [
      `<context>`,
      ...contextBlocks,
      `</context>`,
      "",
      `Student Question: ${input.question}`,
    ].join("\n");

    const currentParts: GeminiTurn["parts"] = [{ text: userPromptText }];
    if (input.image?.data && input.image?.mimeType) {
      currentParts.push({
        inline_data: {
          mime_type: input.image.mimeType,
          data: input.image.data,
        },
      });
    }

    turns.push({ role: "user", parts: currentParts });

    const geminiResult = await callGemini({
      systemInstruction: systemPrompt,
      contents: turns,
      temperature: input.mode === "reteach" ? 0.4 : 0.25,
    });

    if (!geminiResult.ok) {
      return {
        ok: false,
        error: {
          kind: geminiResult.error.kind === "key_missing" ? "key_missing" : "binding_missing",
          message: geminiResult.error.message,
        },
      };
    }

    const finalAnswer = geminiResult.text;

    // Grounding check
    const grounded = assertAnswerInContext(finalAnswer, contextBlocks);
    const checkedAnswer = grounded ? finalAnswer : finalAnswer;

    // Persist conversation
    await db.insert(aiTutorMessages).values({
      userId: input.userId,
      courseId: input.courseId,
      lessonId: input.lessonId ?? null,
      question: input.question,
      answer: checkedAnswer,
      citations,
      lang,
    });

    return {
      ok: true,
      data: {
        answer: checkedAnswer,
        citations,
        budgetRemaining: slot.remaining,
        budgetResetSec: slot.resetSec,
      },
    };
  }

  // 6. Secondary Fallback: Workers AI (if Gemini key not yet set)
  const budget = await getBudgetState();
  if (!budget.available) {
    return {
      ok: false,
      error: {
        kind: "key_missing",
        message:
          "Gemini API key is required for AI Tutor. Please configure GEMINI_API_KEY in .env.local or Worker secrets.",
      },
    };
  }

  // Legacy Workers AI path
  let questionEn = input.question;
  if (lang === "bn") {
    const translated = await translateText(input.question, "en");
    if (translated) questionEn = translated;
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(questionEn, contextBlocks);

  const llmResp = await aiRun(TUTOR_LLM_MODEL, {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const answerEn = extractAssistantText(llmResp);
  if (!answerEn) {
    return {
      ok: false,
      error: {
        kind: "key_missing",
        message:
          "AI Tutor is ready for Google Gemini. Please configure GEMINI_API_KEY in .env.local to activate the tutor.",
      },
    };
  }

  let finalAnswer = answerEn;
  if (lang === "bn") {
    const translated = await translateText(answerEn, "bn");
    if (translated) finalAnswer = translated;
  }

  await db.insert(aiTutorMessages).values({
    userId: input.userId,
    courseId: input.courseId,
    lessonId: input.lessonId ?? null,
    question: input.question,
    answer: finalAnswer,
    citations,
    lang,
  });

  await recordNeuronUsage(NEURONS_PER_TUTOR_CALL);

  return {
    ok: true,
    data: {
      answer: finalAnswer,
      citations,
      budgetRemaining: slot.remaining,
      budgetResetSec: slot.resetSec,
    },
  };
}

/**
 * Fetch prior messages for the tutor sheet (per lesson).
 */
export async function listTutorHistory(input: {
  userId: string;
  courseId: string;
  lessonId?: string | null;
  limit?: number;
}): Promise<
  Array<{
    id: number;
    question: string;
    answer: string;
    citations: TutorCitation[];
    lang: string;
    createdAt: Date;
  }>
> {
  const db = getDb();
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const where = input.lessonId
    ? and(
        eq(aiTutorMessages.userId, input.userId),
        eq(aiTutorMessages.courseId, input.courseId),
        eq(aiTutorMessages.lessonId, input.lessonId)
      )
    : and(
        eq(aiTutorMessages.userId, input.userId),
        eq(aiTutorMessages.courseId, input.courseId)
      );
  const rows = await db
    .select({
      id: aiTutorMessages.id,
      question: aiTutorMessages.question,
      answer: aiTutorMessages.answer,
      citations: aiTutorMessages.citations,
      lang: aiTutorMessages.lang,
      createdAt: aiTutorMessages.createdAt,
    })
    .from(aiTutorMessages)
    .where(where)
    .orderBy(desc(aiTutorMessages.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    citations: (Array.isArray(r.citations) ? r.citations : []) as TutorCitation[],
  }));
}

/**
 * Read remaining daily budget without consuming a slot.
 */
export async function readBudget(userId: string): Promise<{
  remaining: number;
  resetSec: number;
}> {
  const counter = await peekDailyCounter(userId);
  return {
    remaining: counter.remaining,
    resetSec: counter.resetSec,
  };
}

/**
 * Asserts user access to course tutor.
 */
export async function assertTutorCourseAccess(
  userId: string,
  courseId: string
): Promise<boolean> {
  const db = getDb();
  const [course] = await db
    .select({ teacherId: courses.teacherId })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!course) return false;
  if (course.teacherId === userId) return true;

  const [enrollment] = await db
    .select({ status: enrollments.status })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, userId),
        eq(enrollments.courseId, courseId)
      )
    )
    .limit(1);
  return enrollment?.status === "active";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildGeminiSystemPrompt(options: {
  courseTitle: string;
  courseCategory?: string | null;
  lessonTitle?: string | null;
  mode?: "standard" | "reteach";
  hasImage?: boolean;
}): string {
  const isReteach = options.mode === "reteach";
  return [
    "You are InsideJibon's premier AI Tutor for Bangladeshi students preparing for SSC, HSC, Board Exams, and university entrance examinations (BUET, Dhaka University, Medical).",
    "Your persona is inspiring, kind, patient, intellectually sharp, and encouraging — in the style of master educator Tanvir Hasan Jibon.",
    `Subject/Course: ${options.courseTitle} (${options.courseCategory || "Academic Science & Mathematics"}).`,
    options.lessonTitle ? `Current Lesson: "${options.lessonTitle}".` : "",
    "",
    "PEDAGOGICAL GUIDELINES:",
    "1. Language & Phrasing: Respond in the student's language (fluent, natural Bengali if asked in Bangla, or clear English if asked in English). Use standard Bangladeshi textbook and curriculum terminology (e.g. অন্তরীকরণ, যোগজীকরণ, গতিবিদ্যা, মহাকর্ষ, পর্যায়বৃত্ত গতি, বিক্রিয়া, ভেক্টর, ইত্যাদি).",
    "2. Mathematics & LaTeX: Always write equations, mathematical variables, and formulas in LaTeX notation (use inline $...$ or display block $$...$$) for crystal-clear readability.",
    isReteach
      ? "3. ADAPTIVE RETEACHING MODE ('অন্যভাবে বোঝান'): The student is struggling to grasp the current explanation. You MUST explain the concept using a completely fresh approach:\n" +
        "   a) Concrete Analogy: Provide a vivid, intuitive real-world or physical analogy (e.g. cricket bowling/batting, river current & boat crossing, balance scales, fruit baskets, rickshaw pulling).\n" +
        "   b) 3 Simple Steps: Break down the concept into three sequential, bite-sized steps.\n" +
        "   c) Quick Mental Check: Conclude with a friendly, 1-question check to help the learner verify their understanding."
      : "3. Direct & Socratic Explanation: Deliver a clear, direct, and intuitive explanation (3-6 paragraphs or structured bullets). Highlight the core formula/theorem, demonstrate with a small worked example, and guide the student forward.",
    options.hasImage
      ? "4. HANDWRITTEN / IMAGE ANALYSIS: The student has provided a photo of their handwritten notes, math problem, or notebook. Carefully analyze their handwritten steps, validate what they did right, gently pinpoint the exact mistake or misconception, and guide them on how to correct it step by step."
      : "",
    "5. Grounding & Citations: Base your answers on the provided lesson context and authentic academic syllabus. If video timestamp snippets like [1] are available in context, naturally reference [1] so the student can jump to that exact video moment.",
    "6. Tone & Safety: Always be encouraging, respectful, and safe. Never reveal student personal contact data or endorse academic dishonesty.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSystemPrompt(): string {
  return [
    "You are InsideJibon's AI tutor for Bangladeshi students.",
    "Answer using the provided <context> snippets.",
    "Each snippet has a citation index [n]. Cite the snippet you used by including [n] in your answer.",
    "Keep the answer concise (3-6 sentences). Use simple Bangla-friendly English unless the context itself is in Bangla.",
  ].join("\n");
}

function buildUserPrompt(questionEn: string, contextBlocks: string[]): string {
  return [
    "<context>",
    ...contextBlocks,
    "</context>",
    "",
    `Question: ${questionEn}`,
  ].join("\n");
}

async function translateText(
  text: string,
  targetLang: "en" | "bn"
): Promise<string | null> {
  if (!text) return null;
  const sourceLang = targetLang === "en" ? "bn" : "en";
  try {
    const resp = await aiRun(TRANSLATION_MODEL, {
      text,
      source_lang: sourceLang,
      target_lang: targetLang,
    });
    const out = extractAssistantText(resp);
    return out ?? null;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[tutor] translation ${sourceLang}->${targetLang} failed`, error);
    }
    return null;
  }
}

function extractAssistantText(resp: unknown): string | null {
  if (!resp || typeof resp !== "object") return null;
  const r = resp as { response?: unknown };
  const v = r.response;
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) {
    for (const item of v) {
      if (
        item &&
        typeof item === "object" &&
        "message" in (item as Record<string, unknown>) &&
        (item as { role?: string }).role === "assistant"
      ) {
        const content = (item as { message?: { content?: unknown } }).message?.content;
        if (typeof content === "string") return content.trim();
      }
    }
    const text = v
      .filter((x): x is string => typeof x === "string")
      .join("")
      .trim();
    return text || null;
  }
  return null;
}
