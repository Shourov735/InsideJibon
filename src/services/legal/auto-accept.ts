import "server-only";

import { getCurrentUser } from "@/lib/auth";
import { recordAcceptance, hasAcceptedCurrent } from "./acceptances";
import type { LegalDocKey } from "@/content/legal";

/**
 * R10 — Idempotent auto-acceptance for sign-up.
 *
 * When an authenticated user first lands on a page (typically
 * `/continue` after Clerk sign-up), we record an acceptance of every
 * current-version legal doc they have not yet accepted. The
 * `hasAcceptedCurrent` short-circuit keeps this from inserting
 * duplicates on every request.
 *
 * We deliberately do NOT block sign-up on a checkbox — Clerk's
 * hosted SignUp is the only path and we can't inject a checkbox into
 * its iframe. Instead, this best-effort audit row keeps the
 * `legal_acceptances` table populated, and the `/account` page can
 * surface "please review the latest terms" if a new version ships
 * before the user has accepted it.
 */
export async function autoAcceptCurrentDocs(input: {
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const docs: LegalDocKey[] = ["terms", "privacy"];
  for (const doc of docs) {
    const already = await hasAcceptedCurrent({ userId: user.id, doc });
    if (!already) {
      try {
        await recordAcceptance({
          userId: user.id,
          doc,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        });
      } catch {
        // Race: another tab already accepted. Not fatal.
      }
    }
  }
}
