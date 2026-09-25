import "server-only";

import { sql, and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { lessonChunks, lessons, courseModules } from "@/db/schema";
import { CaptionsUnavailableError, fetchYoutubeCaptions, extractYouTubeVideoId } from "./captions";
import { chunkCaptions, chunkText, type Chunk } from "./chunking";
import { embedChunks, upsertChunks } from "./embeddings";
import { vectorizeDelete } from "@/lib/cloudflare/ai";
import { recordNeuronUsage } from "./budget-guard";
import { enqueue } from "@/lib/cloudflare/queues";

/**
 * R8 §3.4 — Caption / lesson-text ingestion pipeline.
 *
 * Called by the EMBEDDINGS_QUEUE consumer (`/api/queues/embeddings`).
 * Triggered by:
 *   - lesson publish (course.actions.publishLesson)
 *   - lesson update  (course.actions.updateLesson)
 *   - manual admin reindex
 *
 * Idempotent: re-running on the same lesson deletes the prior vectors
 * for that lesson + source_kind before upserting. R8 §7 verifies this
 * via Vectorize query and the `lesson_chunks` table.
 *
 * Cost: per call, ~ N embedding inferences where N = chunks / 32.
 * A 30-min lesson at 500-token chunks is ~300 chunks = 10 calls. Each
 * call uses ~50 Neurons (bge-small-en batch), so ~500 Neurons per
 * lesson. The R8 budget of 8,000 Neurons / day supports ~16 reindexes.
 */

export type ReindexJob =
  | {
      kind: "lesson.reindex_captions";
      lessonId: string;
      youtubeVideoId: string;
    }
  | {
      kind: "lesson.reindex_text";
      lessonId: string;
    };

export type PipelineResult = {
  lessonId: string;
  sourceKind: Chunk["sourceKind"];
  chunks: number;
  upserted: number;
  skipped: number;
  skippedReason?: "no_captions" | "no_text" | "binding_missing";
};

const NEURONS_PER_BATCH = 50;

/**
 * Process a single reindex job. Throws on hard failure (DB outage,
 * Network error); the queue consumer will retry per Cloudflare's default
 * retry policy. Soft failures (no captions / empty text) return a result
 * with `skippedReason` so the consumer can ack and move on.
 */
export async function processReindexJob(job: ReindexJob): Promise<PipelineResult> {
  const db = getDb();

  // Resolve the lesson + course so we can persist metadata + scope.
  const [lesson] = await db
    .select({
      id: lessons.id,
      videoUrl: lessons.videoUrl,
      content: lessons.content,
      moduleId: lessons.moduleId,
      courseId: courseModules.courseId,
    })
    .from(lessons)
    .innerJoin(courseModules, eq(courseModules.id, lessons.moduleId))
    .where(eq(lessons.id, job.lessonId))
    .limit(1);
  if (!lesson) {
    throw new Error(`lesson not found: ${job.lessonId}`);
  }
  const courseId = lesson.courseId;

  if (job.kind === "lesson.reindex_captions") {
    return reindexCaptions({
      lessonId: lesson.id,
      courseId,
      videoId: job.youtubeVideoId,
    });
  }
  return reindexText({
    lessonId: lesson.id,
    courseId,
    text: lesson.content ?? "",
  });
}

async function reindexCaptions(args: {
  lessonId: string;
  courseId: string;
  videoId: string;
}): Promise<PipelineResult> {
  const baseResult: PipelineResult = {
    lessonId: args.lessonId,
    sourceKind: "youtube_caption",
    chunks: 0,
    upserted: 0,
    skipped: 0,
  };
  let captions;
  try {
    captions = await fetchYoutubeCaptions(args.videoId);
  } catch (err) {
    if (err instanceof CaptionsUnavailableError) {
      return { ...baseResult, skipped: 1, skippedReason: "no_captions" };
    }
    throw err;
  }
  const chunks = chunkCaptions(captions.segments, captions.effectiveLang);
  if (!chunks.length) {
    return { ...baseResult, skipped: 1, skippedReason: "no_captions" };
  }
  return persistAndEmbed({
    lessonId: args.lessonId,
    courseId: args.courseId,
    chunks,
    sourceKind: "youtube_caption",
  });
}

async function reindexText(args: {
  lessonId: string;
  courseId: string;
  text: string;
}): Promise<PipelineResult> {
  const baseResult: PipelineResult = {
    lessonId: args.lessonId,
    sourceKind: "lesson_text",
    chunks: 0,
    upserted: 0,
    skipped: 0,
  };
  const chunks = chunkText(args.text, "lesson_text", "en");
  if (!chunks.length) {
    return { ...baseResult, skipped: 1, skippedReason: "no_text" };
  }
  return persistAndEmbed({
    lessonId: args.lessonId,
    courseId: args.courseId,
    chunks,
    sourceKind: "lesson_text",
  });
}

async function persistAndEmbed(args: {
  lessonId: string;
  courseId: string;
  chunks: Chunk[];
  sourceKind: Chunk["sourceKind"];
}): Promise<PipelineResult> {
  const db = getDb();

  // 1. Wipe prior chunks + vectors for this (lesson, source_kind). The
  //    unique index on (lesson_id, chunk_index) makes the upsert
  //    idempotent; the vector delete keeps the index clean.
  await db
    .delete(lessonChunks)
    .where(
      and(
        eq(lessonChunks.lessonId, args.lessonId),
        eq(lessonChunks.sourceKind, args.sourceKind)
      )
    );

  // Compute vector ids for the prior set so we can purge them. We only
  // know the CURRENT chunk indices; previous runs may have had more
  // chunks. The deletion above already removed the rows, but the
  // Vectorize vectors persist. To purge safely we widen the id list —
  // ids beyond the current count are no-ops in Vectorize.deleteByIds.
  const maxIdx = Math.max(args.chunks.length - 1, 0);
  const extendedIds: string[] = [];
  for (let i = 0; i <= maxIdx + 32; i++) {
    extendedIds.push(`${args.lessonId}:${args.sourceKind}:${i}`);
  }
  await vectorizeDelete(extendedIds);

  // 2. Insert the new chunk rows. We chunk the insert to keep the
  //    statement under the 65k-parameter limit.
  const rows = args.chunks.map((c) => ({
    lessonId: args.lessonId,
    chunkIndex: c.index,
    text: c.text,
    tokenCount: c.tokenCount,
    vectorId: `${args.lessonId}:${args.sourceKind}:${c.index}`,
    sourceKind: c.sourceKind,
    sourceLang: c.sourceLang,
    startSec: c.startSec,
    endSec: c.endSec,
  }));
  for (let i = 0; i < rows.length; i += 100) {
    await db
      .insert(lessonChunks)
      .values(rows.slice(i, i + 100))
      .onConflictDoUpdate({
        target: [lessonChunks.lessonId, lessonChunks.chunkIndex],
        set: {
          text: sql`excluded.text`,
          tokenCount: sql`excluded.token_count`,
          vectorId: sql`excluded.vector_id`,
          sourceKind: sql`excluded.source_kind`,
          sourceLang: sql`excluded.source_lang`,
          startSec: sql`excluded.start_sec`,
          endSec: sql`excluded.end_sec`,
          updatedAt: sql`now()`,
        },
      });
  }

  // 3. Embed + upsert into Vectorize.
  const vectors = await embedChunks(args.chunks);
  const { upserted, skipped } = await upsertChunks(args.chunks, vectors, {
    lessonId: args.lessonId,
    courseId: args.courseId,
  });

  // 4. Update the lesson's updated_at so the dashboard reflects the
  //    reindex time without re-firing the queue.
  await db
    .update(lessons)
    .set({ updatedAt: new Date() })
    .where(eq(lessons.id, args.lessonId));

  // 5. Track Neurons used. Bge-small-en-v1.5 charges ~1 Neuron per
  //    1000 input tokens; we approximate by batches of 32.
  const batches = Math.ceil(args.chunks.length / 32);
  await recordNeuronUsage(batches * NEURONS_PER_BATCH);

  return {
    lessonId: args.lessonId,
    sourceKind: args.sourceKind,
    chunks: args.chunks.length,
    upserted,
    skipped,
  };
}

/**
 * Enqueue helper used by lesson publish/update actions.
 *
 * IMPORTANT — architecture note (R8 contradiction with OpenNext):
 *
 *   The R8 spec (§3.4) calls for an `EMBEDDINGS_QUEUE` consumer that
 *   drains the queue on a Worker handler. OpenNext for Cloudflare
 *   currently does NOT bridge `queues.consumers` in `wrangler.jsonc`
 *   into a Next.js route — the consumer export must live in the Worker
 *   entry, which OpenNext owns. We therefore execute the reindex
 *   INLINE at the lesson action boundary: the orchestrating Worker
 *   invocation awaits the pipeline. Embeddings are I/O-bound (Workers
 *   AI is a fetch), so CPU stays under the 10ms Free-plan cap even
 *   for lessons with 30+ caption chunks.
 *
 *   We still emit to `EMBEDDINGS_QUEUE` (producer-only) so an external
 *   consumer — added later by configuring a Worker entry export — can
 *   pick up missed jobs without code changes here.
 *
 *   Callers should `void enqueueLessonReindex(...)` so the lesson
 *   action returns immediately and the indexing happens in the
 *   background of the request.
 */
export async function enqueueLessonReindex(input: {
  lessonId: string;
  videoUrl: string | null;
}): Promise<void> {
  const videoId = extractYouTubeVideoId(input.videoUrl);
  const job: ReindexJob = videoId
    ? {
        kind: "lesson.reindex_captions",
        lessonId: input.lessonId,
        youtubeVideoId: videoId,
      }
    : { kind: "lesson.reindex_text", lessonId: input.lessonId };

  // 1. Inline execution (always — see architecture note above).
  try {
    await processReindexJob(job);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[ai] inline reindex failed for lesson=${input.lessonId}:`,
        error
      );
    }
  }

  // 2. Also enqueue for any future consumer that drains missed jobs.
  //    Producers are free; messages that nobody consumes just expire
  //    in 14 days on the Free plan.
  try {
    await enqueue<ReindexJob>("EMBEDDINGS_QUEUE", {
      type: videoId ? "lesson.reindex_captions" : "lesson.reindex_text",
      id: `reindex:${input.lessonId}:${Date.now()}`,
      payload: job,
    });
  } catch {
    // Queue binding not configured (Node dev) — silent.
  }
}
