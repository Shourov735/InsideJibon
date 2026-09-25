import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * R8 — Workers AI + Vectorize binding helpers.
 *
 * Wraps the two Cloudflare bindings introduced in the R8 remaster
 * (see docs/remaster-phase-8-ai-tutor.md §3 and §5, and
 * FREE-TIER-REFERENCE.md §5 and §6):
 *
 * - `AI`        — Workers AI inference (embeddings, chat, translation).
 *                 10,000 Neurons / day free tier.
 * - `VECTORIZE` — Vectorize vector DB over the `lessons_v1` index
 *                 (384-dim cosine). 30M dims stored + 30M queries / month
 *                 on the free tier.
 *
 * Bindings are resolved lazily per call, matching the OpenNext / Workers
 * model documented in `kv.ts` and `queues.ts`. In Node dev (no bindings)
 * each accessor returns `null` so the service layer can short-circuit
 * without crashing on import — the tutor side sheet then renders the
 * "free tier unavailable in dev" fallback that the UI already supports.
 *
 * CRITICAL: no paid AI / Vectorize tier. We stay on the Free plan. See
 * FREE-TIER-REFERENCE.md §5 (Vectorize) and §6 (Workers AI).
 */

// ---------------------------------------------------------------------------
// AI binding
// ---------------------------------------------------------------------------

export type AiBinding = {
  run(
    model: string,
    input: ReadableStream | ArrayBuffer | Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<AiRunResponse>;
};

export type AiRunResponse = {
  // Workers AI returns the model-specific shape in `response`. We type
  // it as `unknown` at the boundary and let each caller narrow.
  response: unknown;
  // The raw fetch Response, useful when callers want to stream tokens.
  // We do not consume this in the hot path; callers that need streaming
  // should opt in explicitly via `aiStream`.
  [key: string]: unknown;
};

async function resolveAi(): Promise<AiBinding | null> {
  let env: Record<string, unknown>;
  try {
    const ctx = await getCloudflareContext({ async: true });
    env = ctx.env as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
  const binding = env["AI"];
  if (!binding || typeof (binding as AiBinding).run !== "function") {
    return null;
  }
  return binding as AiBinding;
}

/**
 * True iff the current runtime exposes a real Workers AI binding. Used by
 * the tutor + quiz-generator services to decide between inference and the
 * "free tier unavailable" fallback.
 */
export async function hasAiRuntime(): Promise<boolean> {
  return (await resolveAi()) !== null;
}

/**
 * Run a Workers AI inference. Returns `null` when the binding is not
 * configured (Node dev); callers should treat null as a hard failure and
 * surface the R8 budget-guard message to the user.
 *
 * NOTE: the runtime invocation cost is bounded by the orchestrating code,
 * not by the AI inference itself — Workers AI is an HTTP fetch from the
 * Worker to the inference gateway, so it counts as I/O and stays well
 * under the 10ms CPU / invocation Free-plan cap.
 */
export async function aiRun(
  model: string,
  input: Record<string, unknown>,
  options?: Record<string, unknown>
): Promise<AiRunResponse | null> {
  const ai = await resolveAi();
  if (!ai) return null;
  try {
    return await ai.run(model, input, options);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[ai] run failed for ${model}:`, error);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Vectorize binding
// ---------------------------------------------------------------------------

export type VectorMetadata = Record<string, string | number | boolean>;

export type VectorizeBinding = {
  insert(vectors: Array<{ id: string; values: number[]; metadata?: VectorMetadata }>): Promise<{
    ids: string[];
    count: number;
  }>;
  upsert(vectors: Array<{ id: string; values: number[]; metadata?: VectorMetadata }>): Promise<{
    ids: string[];
    count: number;
  }>;
  query(query: {
    vector: number[];
    topK: number;
    filter?: Record<string, unknown>;
    returnMetadata?: "all" | "indexed" | "none";
  }): Promise<{
    matches: Array<{
      id: string;
      score: number;
      metadata?: VectorMetadata;
    }>;
    count: number;
  }>;
  deleteByIds(ids: string[]): Promise<{ count: number }>;
};

async function resolveVectorize(): Promise<VectorizeBinding | null> {
  let env: Record<string, unknown>;
  try {
    const ctx = await getCloudflareContext({ async: true });
    env = ctx.env as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
  const binding = env["VECTORIZE"];
  if (!binding || typeof (binding as VectorizeBinding).upsert !== "function") {
    return null;
  }
  return binding as VectorizeBinding;
}

export async function hasVectorizeRuntime(): Promise<boolean> {
  return (await resolveVectorize()) !== null;
}

/**
 * Upsert a single vector with metadata into the `lessons_v1` index. The
 * vector id is the chunk's stable `${lessonId}:${chunkIndex}` key so
 * re-indexing is idempotent.
 */
export async function vectorizeUpsert(
  id: string,
  values: number[],
  metadata: VectorMetadata
): Promise<boolean> {
  const v = await resolveVectorize();
  if (!v) return false;
  await v.upsert([{ id, values, metadata }]);
  return true;
}

export type VectorizeMatch = {
  id: string;
  score: number;
  metadata?: VectorMetadata;
};

export async function vectorizeQuery(
  vector: number[],
  topK: number,
  filter?: Record<string, unknown>
): Promise<VectorizeMatch[]> {
  const v = await resolveVectorize();
  if (!v) return [];
  const res = await v.query({
    vector,
    topK,
    filter,
    returnMetadata: "all",
  });
  return res.matches;
}

export async function vectorizeDelete(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const v = await resolveVectorize();
  if (!v) return false;
  await v.deleteByIds(ids);
  return true;
}
