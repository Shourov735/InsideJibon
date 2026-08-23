import "server-only";
import { getDb } from "@/db";
import { assignmentSubmissionFiles, materials } from "@/db/schema";
import type { Storage } from "@/lib/storage";

/**
 * Storage governance: reconciles the R2 bucket against live DB rows.
 *
 * Every byte in the bucket lives under `courses/` and is referenced by either
 * `materials.storageKey` or `assignment_submission_files.storageKey`. The
 * normal delete flows are best-effort (R2 cannot join Postgres transactions),
 * so any failure between row deletion and object deletion leaks an object
 * that nothing will ever request again. This sweep lists the bucket, diffs
 * against the authoritative key set and removes the orphans in batched
 * deletes. Run it as a dry run first; only `dryRun: false` deletes.
 */

const ROOT_PREFIX = "courses/";

export interface ReconcileReport {
  dryRun: boolean;
  scannedKeys: number;
  referencedKeys: number;
  orphanedKeys: number;
  deletedKeys: string[];
}

async function listAllKeys(storage: Storage): Promise<string[]> {
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await storage.listObjects({
      prefix: ROOT_PREFIX,
      cursor,
      limit: 1000,
    });
    keys.push(...page.keys);
    cursor = page.nextCursor;
  } while (cursor);
  return keys;
}

export async function reconcileStorageOrphans(
  storage: Storage,
  options?: { dryRun?: boolean }
): Promise<ReconcileReport> {
  const db = getDb();
  const dryRun = options?.dryRun !== false;

  const [storedKeys, materialRows, fileRows] = await Promise.all([
    listAllKeys(storage),
    db.select({ storageKey: materials.storageKey }).from(materials),
    db
      .select({ storageKey: assignmentSubmissionFiles.storageKey })
      .from(assignmentSubmissionFiles),
  ]);

  const referenced = new Set<string>();
  for (const row of materialRows) referenced.add(row.storageKey);
  for (const row of fileRows) referenced.add(row.storageKey);

  const orphans = storedKeys.filter((key) => !referenced.has(key));

  let deletedKeys: string[] = [];
  if (!dryRun && orphans.length > 0) {
    await storage.deleteObjects(orphans);
    deletedKeys = orphans;
  }

  return {
    dryRun,
    scannedKeys: storedKeys.length,
    referencedKeys: referenced.size,
    orphanedKeys: orphans.length,
    deletedKeys,
  };
}
