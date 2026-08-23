import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/permissions";
import { getDefaultStorage } from "@/lib/storage";
import { reconcileStorageOrphans } from "@/services/admin/storage-reconcile";

export const dynamic = "force-dynamic";

/**
 * Admin storage governance endpoint: reconciles the R2 bucket against live
 * DB rows and (when `dryRun` is false) deletes orphaned objects. Defaults to
 * a read-only dry run so the report can be inspected before any deletion.
 */
export async function POST(request: NextRequest) {
  await requireAdmin();

  let dryRun = true;
  try {
    const body = await request.json();
    if (body && typeof body === "object" && "dryRun" in body) {
      dryRun = Boolean((body as { dryRun?: unknown }).dryRun);
    }
  } catch {
    // Empty or invalid body — keep the safe default (dry run).
  }

  try {
    const report = await reconcileStorageOrphans(getDefaultStorage(), { dryRun });
    return NextResponse.json(report);
  } catch (error) {
    console.error("Storage reconciliation failed:", error);
    return NextResponse.json(
      { error: "Storage reconciliation failed." },
      { status: 503 }
    );
  }
}
