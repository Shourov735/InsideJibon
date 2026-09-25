import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/permissions";
import { indexCommandItems } from "@/services/command";

/**
 * R1 §4 — GET /api/command?q=...
 *
 * Returns a `CommandIndexResult` for the authenticated caller.
 * Authorization: requires any signed-in user. The data layer then
 * filters items based on the user's role (students only see enrolled
 * courses, teachers only see their own).
 *
 * Cache-Control: no-store — every request returns per-user data.
 */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ items: [] }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";

  try {
    const result = await indexCommandItems(user, q);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (caught) {
    // Don't leak server errors through the palette — return an empty
    // result and let the client render the empty state.
    if (caught instanceof Error) {
      console.error("[/api/command] error:", caught.message);
    }
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
