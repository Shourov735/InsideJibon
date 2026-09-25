import "server-only";

import type { CaptionSegment } from "./captions";

/**
 * R8 §3.2 — Caption/text chunking for the RAG index.
 *
 * Splits concatenated text into ~`targetTokens` chunks with ~`overlapTokens`
 * overlap. Token estimate uses a 4-chars-per-token heuristic — good enough
 * for English and acceptable for Bangla since both languages have similar
 * mean token lengths. We do NOT depend on tiktoken or a model-specific
 * tokenizer, because those would add a paid dependency and ~10MB of
 * WASM to the Workers runtime, blowing the 10ms CPU Free-plan cap.
 *
 * For caption chunks we preserve `startSec` / `endSec` from the first and
 * last segment in the chunk — that's the citation timestamp shown to the
 * student (R8 §4.1).
 */

export type ChunkSourceKind = "youtube_caption" | "lesson_text" | "material_text";
export type ChunkSourceLang = "en" | "bn";

export type Chunk = {
  /** 0-based chunk index inside the lesson. Stable across reindex. */
  index: number;
  /** Chunk text content. */
  text: string;
  /** Approximate token count (chars / 4). */
  tokenCount: number;
  /** Source kind. */
  sourceKind: ChunkSourceKind;
  /** Source language. */
  sourceLang: ChunkSourceLang;
  /** First caption timestamp in the chunk (seconds). null for non-captions. */
  startSec: number | null;
  /** Last caption timestamp in the chunk (seconds). null for non-captions. */
  endSec: number | null;
};

const TARGET_TOKENS = 500;
const OVERLAP_TOKENS = 50;

/** Approximate token count via the 4-chars-per-token heuristic. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Chunk an array of caption segments. We concatenate all segments into a
 * flat stream of (text, startSec) pairs, then split by character window
 * so each chunk holds ~TARGET_TOKENS characters. startSec/endSec come
 * from the first and last segment in the window.
 */
export function chunkCaptions(
  segments: ReadonlyArray<CaptionSegment>,
  sourceLang: ChunkSourceLang = "en"
): Chunk[] {
  if (!segments.length) return [];

  // Flatten: each segment becomes a (text, startSec, endSec) tuple.
  // We treat the start of a segment as its citation anchor.
  const tokens: Array<{ text: string; startSec: number; endSec: number }> = [];
  for (const seg of segments) {
    const text = seg.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const startSec = Math.max(0, Math.floor(seg.start));
    const endSec = Math.max(startSec, Math.floor(seg.start + seg.duration));
    tokens.push({ text, startSec, endSec });
  }
  if (!tokens.length) return [];

  const targetChars = TARGET_TOKENS * 4;
  const overlapChars = OVERLAP_TOKENS * 4;
  const chunks: Chunk[] = [];

  let buf: typeof tokens = [];
  let bufChars = 0;

  const flush = (index: number) => {
    if (!buf.length) return;
    const text = buf.map((t) => t.text).join(" ");
    const startSec = buf[0]?.startSec ?? null;
    const endSec = buf[buf.length - 1]?.endSec ?? null;
    chunks.push({
      index,
      text,
      tokenCount: estimateTokens(text),
      sourceKind: "youtube_caption",
      sourceLang,
      startSec,
      endSec,
    });
  };

  let chunkIndex = 0;
  for (const tok of tokens) {
    const piece = (buf.length ? " " : "") + tok.text;
    if (bufChars + piece.length > targetChars && buf.length) {
      flush(chunkIndex++);
      // Overlap: keep the last few tokens so the boundary doesn't lose
      // semantic context.
      const keep: typeof tokens = [];
      let keepChars = 0;
      for (let i = buf.length - 1; i >= 0; i--) {
        const t = buf[i];
        if (!t) continue;
        if (keepChars + t.text.length > overlapChars) break;
        keep.unshift(t);
        keepChars += t.text.length + 1;
      }
      buf = keep;
      bufChars = keepChars;
    }
    buf.push(tok);
    bufChars += piece.length;
  }
  if (buf.length) flush(chunkIndex);

  return chunks;
}

/**
 * Chunk plain text (used by the lesson_text and material fallback paths:
 * lesson content + material excerpts). We split on sentence boundaries when
 * possible to keep chunks semantically coherent. startSec/endSec are null.
 */
export function chunkText(
  text: string,
  sourceKind: ChunkSourceKind,
  sourceLang: ChunkSourceLang = "en"
): Chunk[] {
  const cleaned = (text ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const targetChars = TARGET_TOKENS * 4;
  const overlapChars = OVERLAP_TOKENS * 4;
  const chunks: Chunk[] = [];

  // Sentence-aware splitting: keeps mid-sentence breaks rare.
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  let buf: string[] = [];
  let bufChars = 0;
  let chunkIndex = 0;

  const flush = () => {
    if (!buf.length) return;
    const text = buf.join(" ");
    chunks.push({
      index: chunkIndex++,
      text,
      tokenCount: estimateTokens(text),
      sourceKind,
      sourceLang,
      startSec: null,
      endSec: null,
    });
  };

  for (const sentence of sentences) {
    if (bufChars + sentence.length > targetChars && buf.length) {
      flush();
      // Overlap window: keep last few sentences worth of overlap.
      const keep: string[] = [];
      let keepChars = 0;
      for (let i = buf.length - 1; i >= 0; i--) {
        const s = buf[i];
        if (!s) continue;
        if (keepChars + s.length > overlapChars) break;
        keep.unshift(s);
        keepChars += s.length + 1;
      }
      buf = keep;
      bufChars = keepChars;
    }
    buf.push(sentence);
    bufChars += sentence.length + 1;
  }
  if (buf.length) flush();

  return chunks;
}
