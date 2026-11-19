import "server-only";

import { getEnv } from "@/lib/env";

export const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";

const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
];

export type GeminiInlineData = {
  mimeType: string;
  data: string; // Base64 encoded without data URL prefix
};

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export type GeminiTurn = {
  role: "user" | "model";
  parts: GeminiPart[];
};

export type GeminiErrorKind =
  | "key_missing"
  | "unauthorized"
  | "quota"
  | "unavailable"
  | "empty_response";

export type GeminiError = {
  kind: GeminiErrorKind;
  message: string;
};

export type GeminiResponse =
  | { ok: true; text: string; model: string }
  | {
      ok: false;
      error: GeminiError;
    };

/**
 * Resolves the Gemini API key from environment variables.
 * Returns null if not configured.
 */
export function getGeminiApiKey(): string | null {
  try {
    const env = getEnv();
    const key = env.GEMINI_API_KEY?.trim();
    if (key) return key;
  } catch {
    // Fall back to process.env in edge cases
  }
  const fallback = process.env.GEMINI_API_KEY?.trim();
  return fallback || null;
}

/**
 * Returns true if Gemini API key is configured.
 */
export function hasGeminiKey(): boolean {
  return getGeminiApiKey() !== null;
}

/**
 * Returns the configured Gemini model identifier.
 */
export function getGeminiModel(): string {
  try {
    const env = getEnv();
    const model = env.AI_TUTOR_GEMINI_MODEL?.trim();
    if (model) return model;
  } catch {
    // Ignored
  }
  return process.env.AI_TUTOR_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

/**
 * Executes a generation request against the Google Gemini REST API.
 * Uses global fetch, fully compatible with Cloudflare Workers (OpenNext) and Node.
 * Automatically tries fallback models if the primary model is overloaded (503/524/timeout).
 */
export async function callGemini(options: {
  systemInstruction?: string;
  contents: GeminiTurn[];
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<GeminiResponse> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error: {
        kind: "key_missing",
        message:
          "Gemini API key is not configured. Please add GEMINI_API_KEY to .env.local or worker secrets.",
      },
    };
  }

  const primaryModel = getGeminiModel();
  const modelsToTry = Array.from(new Set([primaryModel, ...FALLBACK_MODELS]));

  const payload: Record<string, unknown> = {
    contents: options.contents,
    generationConfig: {
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
    },
  };

  if (options.systemInstruction) {
    payload.system_instruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  let lastError: GeminiError = {
    kind: "unavailable",
    message: "Failed to connect to Google Gemini service.",
  };

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });

      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          error: {
            kind: "unauthorized",
            message:
              "Gemini API authorization failed. Please verify that your GEMINI_API_KEY has access in Google AI Studio.",
          },
        };
      }

      if (res.status === 429) {
        return {
          ok: false,
          error: {
            kind: "quota",
            message:
              "Gemini API rate limit or quota exceeded. Please try again shortly or check AI Studio quota.",
          },
        };
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        lastError = {
          kind: "unavailable",
          message: `Gemini (${model}) responded with status ${res.status}: ${errorText.slice(0, 150)}`,
        };
        // For temporary spikes (503/524) or model-specific errors, try the next model
        if ((res.status === 503 || res.status === 524 || res.status === 404) && i < modelsToTry.length - 1) {
          console.warn(`[gemini] ${model} returned ${res.status}, trying fallback ${modelsToTry[i + 1]}...`);
          continue;
        }
        return { ok: false, error: lastError };
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string; thought?: boolean }>;
          };
        }>;
      };

      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const texts = parts
        .filter((p) => typeof p.text === "string" && !p.thought)
        .map((p) => p.text as string);

      const fullText = texts.join("").trim();
      if (!fullText) {
        return {
          ok: false,
          error: {
            kind: "empty_response",
            message: "Gemini returned an empty response. Try asking in a different way.",
          },
        };
      }

      return {
        ok: true,
        text: fullText,
        model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      lastError = {
        kind: "unavailable",
        message: `Failed to reach Google Gemini API (${model}): ${message}`,
      };
      // Timeout or network drop on current model — try next fallback model
      if (i < modelsToTry.length - 1) {
        console.warn(`[gemini] ${model} threw error (${message}), trying fallback ${modelsToTry[i + 1]}...`);
        continue;
      }
    }
  }

  return { ok: false, error: lastError };
}
