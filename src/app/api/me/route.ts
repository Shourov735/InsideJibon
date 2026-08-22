import { NextResponse } from "next/server";

import { resolveCurrentUser } from "@/lib/auth";

/**
 * Lightweight identity endpoint for client components. Returns the
 * application role of the current session (or null) so UI rendered
 * before sign-in — e.g. the marketing header — can update its links
 * without a full page reload.
 */
export async function GET() {
  const { user } = await resolveCurrentUser();

  return NextResponse.json(
    { authenticated: Boolean(user), role: user?.role ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
