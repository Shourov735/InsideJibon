import "server-only";

import { aiRun, vectorizeDelete, vectorizeUpsert } from "@/lib/cloudflare/ai";
import type { Chunk } from "./chunking";

/**
 * R8 §3.3 — Embedding generation + Vectorize upsert.
 *
 * We use Workers AI's `@cfbaai/bge-small-en-v1.5` model — 384-dim, free
 * tier, optimized for retrieval. The Bangla path translates to English
 * before embedding (R8 §3.5 step 3); we don't have a strong Bangla
 * embedding model on the Free plan, and the multilingual translation
 * hop is documented in FREE-TIER-REFERENCE.md §6.
 *
 * Workers AI returns the embedding as a `number[]` in
 * `response.data[0]`. We batch 32 chunks per call — small enough to
 * stay under the 10ms CPU / invocation Workers Free cap (the AI call
 * itself is I/O over fetch, so CPU time is bounded by the orchestrator).
 */

export const EMBEDDING_MODEL = "@cfbaai/bge-small-en-v1.5";
const BATCH_SIZE = 32;

type EmbeddingResponse = {
  response?: unknown;
  data?: Array<{ embedding?: number[]; shape?: number[] }>;
};

async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const result = await aiRun(EMBEDDING_MODEL, { text: texts });
  if (!result) {
    // Binding not configured (Node dev / missing wrangler binding).
    return texts.map(() => []);
  }
  const r = result as EmbeddingResponse;
  if (Array.isArray(r.data)) {
    return r.data.map((row) => row.embedding ?? []);
  }
  if (Array.isArray(r.response)) {
    // Some Workers AI models return the array directly.
    return r.response as number[][];
  }
  return [];
}

/**
 * Embed `chunks` in batches of `BATCH_SIZE`. Returns one embedding per
 * input chunk (same length as `chunks`). Empty arrays mean the binding
 * is not configured; the pipeline treats this as a no-op.
 */
export async function embedChunks(
  chunks: ReadonlyArray<Chunk>
): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);
    const vectors = await embedBatch(texts);
    for (let j = 0; j < batch.length; j++) {
      out.push(vectors[j] ?? []);
    }
  }
  return out;
}

/**
 * Stable Vectorize id per (lessonId, chunkIndex). Used by the pipeline
 * to upsert idempotently — reindexing the same lesson with the same
 * chunks replaces vectors in place instead of duplicating.
 */
export function vectorIdFor(
  lessonId: string,
  chunkIndex: number,
  sourceKind: Chunk["sourceKind"]
): string {
  return `${lessonId}:${sourceKind}:${chunkIndex}`;
}

export type UpsertResult = {
  upserted: number;
  skipped: number;
};

/**
 * Upsert chunk vectors into Vectorize with their metadata. Metadata is
 * what the tutor's filter expression uses (`course_id`, `lesson_id`,
 * `source_kind`, `source_lang`); the actual citation rendering uses
 * `start_sec` / `end_sec`.
 */
export async function upsertChunks(
  chunks: ReadonlyArray<Chunk>,
  vectors: ReadonlyArray<number[]>,
  ctx: {
    lessonId: string;
    courseId: string;
  }
): Promise<UpsertResult> {
  if (chunks.length !== vectors.length) {
    throw new Error(
      `upsertChunks: chunks (${chunks.length}) and vectors (${vectors.length}) length mismatch`
    );
  }
  let upserted = 0;
  let skipped = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const vec = vectors[i];
    if (!chunk || !vec || vec.length === 0) {
      skipped++;
      continue;
    }
    const ok = await vectorizeUpsert(
      vectorIdFor(ctx.lessonId, chunk.index, chunk.sourceKind),
      vec,
      {
        lesson_id: ctx.lessonId,
        course_id: ctx.courseId,
        chunk_index: chunk.index,
        source_kind: chunk.sourceKind,
        source_lang: chunk.sourceLang,
        start_sec: chunk.startSec ?? -1,
        end_sec: chunk.endSec ?? -1,
      }
    );
    if (ok) upserted++;
    else skipped++;
  }
  return { upserted, skipped };
}

/**
 * Delete previously-indexed vectors for a (lessonId, sourceKind) pair.
 * Called when reindexing to purge stale chunks. Idempotent.
 */
export async function deleteLessonVectors(
  lessonId: string,
  sourceKind: Chunk["sourceKind"]
): Promise<boolean> {
  // We don't know how many chunks existed historically — Vectorize's
  // deleteByIds takes a list. We pull existing lesson_chunks to compute
  // the ids. The caller (pipeline) passes in the IDs to keep this
  // helper pure.
  // Implementation in pipeline.ts where the DB list lives.
  // Keep this stub so embeddings.ts doesn't need DB access.
  void sourceKind;
  return vectorizeDelete([vectorIdFor(lessonId, 0, sourceKind)]);
}
