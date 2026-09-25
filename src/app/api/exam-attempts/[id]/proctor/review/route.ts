import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/permissions";
import { flagAttempt, markReviewed } from "@/services/proctoring/events";

/**
 * R9 — Teacher review action on a flagged attempt.
 *
 * `accept` — clears the flag state by stamping `proctor_reviewed_at` so
 *   analytics treat it as resolved.
 * `void`   — flips `proctor_flagged` so the attempt is excluded from
 *   pass/fail analytics (the underlying score is preserved).
 *
 * Both actions stamp the reviewer (current user). Subsequent calls
 * are idempotent: `proctor_reviewed_at` is overwritten with the latest
 * reviewer.
 */

const payloadSchema = z.object({
  action: z.enum(["accept", "void"]),
});

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (user.role === "student") {
    return NextResponse.json(
      { ok: false, detail: "forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }
  const { id } = await context.params;

  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, detail: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    if (parsed.data.action === "void") {
      await flagAttempt({ attemptId: id });
    }
    await markReviewed({ attemptId: id });
    return NextResponse.json(
      { ok: true, reviewedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, detail: (error as Error).message },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
