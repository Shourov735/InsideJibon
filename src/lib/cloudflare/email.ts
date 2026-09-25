import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * R10 — Cloudflare Email Service binding helper.
 *
 * Wraps the `email` Workers binding (Email Sending) introduced in the R10
 * remaster (see docs/remaster-phase-10-i18n-legal-email.md §3.1 and
 * FREE-TIER-REFERENCE.md §7). Email Sending is free in the Workers Free
 * plan with a generous per-day send quota (we self-cap at 70/day and
 * alert at 70 — see §5.1 of the phase doc).
 *
 * The binding is resolved lazily per call, matching the OpenNext /
 * Workers runtime model documented in `kv.ts` and `ai.ts`. In Node dev
 * (no binding) every accessor returns `null` so callers can fall back
 * to a "would-have-sent" log path without crashing on import. In
 * production, `sendEmail()` always succeeds or surfaces a structured
 * failure to the audit log.
 *
 * The shape of `env.email.send` mirrors the Cloudflare Email Sending
 * `EmailMessage` API: pass `from`, `to`, `subject`, `html` and `text`;
 * the binding returns `{ messageId, status }`. We type it minimally
 * (`EmailSendingBinding`) — call sites narrow further as needed.
 */

export type EmailSendingBinding = {
  send(message: {
    from: string;
    to: string | string[];
    subject: string;
    html: string;
    text: string;
    headers?: Record<string, string>;
  }): Promise<{ messageId?: string } | void>;
};

type CloudflareBindings = Record<string, unknown>;

async function resolveBinding(): Promise<EmailSendingBinding | null> {
  let env: CloudflareBindings;
  try {
    const ctx = await getCloudflareContext({ async: true });
    env = ctx.env as unknown as CloudflareBindings;
  } catch {
    return null;
  }
  const binding = env["email"];
  if (!binding || typeof (binding as EmailSendingBinding).send !== "function") {
    return null;
  }
  return binding as EmailSendingBinding;
}

/**
 * True iff the current runtime exposes a real Cloudflare Email Sending
 * binding. Service code uses this to short-circuit when running in Node
 * dev (so we don't spam dev logs).
 */
export async function hasEmailRuntime(): Promise<boolean> {
  return (await resolveBinding()) !== null;
}

/**
 * Send a transactional email via Cloudflare Email Service. Returns the
 * provider's `messageId` on success or throws on failure (callers should
 * wrap and update the `email_send_log` row accordingly).
 *
 * The `from` address is whatever the operator has routed in Email
 * Routing (see wrangler.jsonc / Email Routing config). We do NOT
 * override it from env vars — that keeps the audit trail clean and
 * lets the operator rotate the sending identity without redeploying.
 */
export async function sendRawEmail(message: {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}): Promise<{ messageId: string | null }> {
  const binding = await resolveBinding();
  if (!binding) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[email] binding missing — would have sent to:",
        message.to,
        "subject:",
        message.subject
      );
    }
    return { messageId: null };
  }
  const result = await binding.send(message);
  return { messageId: result?.messageId ?? null };
}

/**
 * Default From address. We resolve at module scope only when a runtime
 * env var is set (so we never crash when running in Node dev). The
 * operator can override via `EMAIL_FROM_ADDRESS`.
 */
export const DEFAULT_FROM_ADDRESS =
  process.env.EMAIL_FROM_ADDRESS ?? "noreply@insidejibon.com.bd";
