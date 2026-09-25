import "server-only";

/**
 * R8 §3.6 — Safety / quality guardrails.
 *
 * Two responsibilities:
 *
 *   1. `isAllowedQuestion(question)` — strip PII (emails, phone numbers)
 *      from the user input before sending it to the LLM. If PII is
 *      detected we reject the request with `400` so the user gets a
 *      clear error.
 *
 *   2. `assertAnswerInContext(answer, retrievedContext)` — heuristic
 *      check that the synthesized answer actually references retrieved
 *      context. Citations are NON-NEGOTIABLE per R8 §5. If the LLM
 *      didn't include a citation we strip the answer and return the
 *      safety fallback so the student never sees an un-cited answer.
 *
 * The token-Jaccard heuristic is intentionally simple — the LLM is
 * already constrained by the system prompt to cite context snippets
 * and to refuse when context doesn't contain the answer. This is the
 * belt-and-braces check.
 */

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_PATTERN =
  /(?:\+?88)?(?:\s|-)?0?1[3-9](?:\s|-)?\d{2}(?:\s|-)?\d{6}/;

export type SafetyVerdict =
  | { ok: true }
  | { ok: false; reason: "email" | "phone" | "empty" | "too_long" };

const MAX_QUESTION_CHARS = 800;

export function isAllowedQuestion(question: string): SafetyVerdict {
  const trimmed = (question ?? "").trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (trimmed.length > MAX_QUESTION_CHARS) {
    return { ok: false, reason: "too_long" };
  }
  if (EMAIL_PATTERN.test(trimmed)) return { ok: false, reason: "email" };
  if (PHONE_PATTERN.test(trimmed)) return { ok: false, reason: "phone" };
  return { ok: true };
}

/**
 * Heuristic check that the answer actually engages with the retrieved
 * context. We:
 *   1. Require at least one citation token (`[n]`) in the answer text.
 *   2. Compute token-Jaccard between answer and context; require ≥ 0.05.
 *
 * Returns true when the answer is plausibly grounded. False triggers the
 * safety fallback in the tutor UI.
 */
export function assertAnswerInContext(
  answer: string,
  retrievedContext: ReadonlyArray<string>
): boolean {
  if (!answer) return false;
  // Citations are mandatory.
  const citationMatch = answer.match(/\[\d+\]/);
  if (!citationMatch) return false;

  const answerTokens = tokenize(answer);
  if (answerTokens.length === 0) return false;

  const contextTokens = new Set<string>();
  for (const ctx of retrievedContext) {
    for (const tok of tokenize(ctx)) contextTokens.add(tok);
  }
  if (contextTokens.size === 0) return false;

  let intersection = 0;
  for (const tok of answerTokens) {
    if (contextTokens.has(tok)) intersection++;
  }
  const jaccard =
    intersection /
    (answerTokens.length + contextTokens.size - intersection);
  return jaccard >= 0.05;
}

function tokenize(s: string): string[] {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09ff\s]+/g, " ")
    .split(/\s+/)
    .filter((w): w is string => typeof w === "string" && w.length >= 3);
}