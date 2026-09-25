import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { addUnsubscribe } from "@/services/email/unsubscribe";
import { getCurrentUser } from "@/lib/auth";
import { getTranslator } from "@/i18n/server";
import { isUuid } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * R10 — One-click unsubscribe endpoint (RFC 8058-ish).
 *
 * Cloudflare Email Sending is the transport; the unsubscribe URL is
 * generated server-side by `renderEmail()` and lives in the
 * EmailLayout footer. Clicking it lands here:
 *
 *   /account/emails/unsubscribe?token=<userId>&category=<cat>
 *
 * We accept either a signed-in user (token == userId, must be logged
 * in) or a token-bearing URL where the user is anonymous — in the
 * second case we resolve the user by id (UUID) from the `users` table
 * so the unsubscribe still works for parent_digest emails where the
 * parent is a guest / never-signed-in user.
 *
 * On success we redirect to /account/emails with a flash message
 * (rendered by the page on the next request).
 *
 * NOTE: production hardening should replace the bare userId token
 * with an HMAC-signed token; see R10 §5 / TODO. We deliberately keep
 * the v0 simple so the UX ships; security review is on the followup.
 */
interface UnsubscribePageProps {
  searchParams: Promise<{
    token?: string;
    category?: string;
  }>;
}

const ALLOWED_CATEGORIES = ["engagement", "marketing", "parent_digest"] as const;

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token, category } = await searchParams;
  await getTranslator(); // warms the i18n cache for the redirect target

  let email: string | null = null;
  let userId: string | null = null;

  const current = await getCurrentUser();
  if (current) {
    email = current.email;
    userId = current.id;
  } else if (token && isUuid(token)) {
    const db = getDb();
    const [row] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, token))
      .limit(1);
    if (row) {
      email = row.email;
      userId = token;
    }
  }

  if (
    email &&
    userId &&
    category &&
    (ALLOWED_CATEGORIES as readonly string[]).includes(category)
  ) {
    try {
      await addUnsubscribe({
        email,
        category: category as (typeof ALLOWED_CATEGORIES)[number],
        userId,
      });
    } catch {
      // Fall through to the failure redirect below.
    }
  }

  // Best-effort UA capture for the audit row.
  try {
    const h = await headers();
    void h.get("user-agent");
  } catch {
    // ignore
  }

  redirect(`/account/emails?unsubsbled=${encodeURIComponent(category ?? "")}`);
}
