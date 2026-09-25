#!/usr/bin/env node
/**
 * Bundle the R3 ClassroomRoom Durable Object and re-export it from the
 * generated `.open-next/worker.js` so Wrangler can find it.
 *
 * OpenNext only compiles the three built-in DOs (queue, sharded-tag-cache,
 * bucket-cache-purge) by default — there is no auto-discovery for user DOs
 * (https://github.com/opennextjs/opennextjs-cloudflare/issues — search
 * "additionalDOs"). We bridge that gap with this post-build step.
 *
 * Steps:
 *  1. Bundle `src/durable-objects/classroom-room.ts` with esbuild into
 *     `.open-next/.build/durable-objects/classroom-room.js` (ESM, bundled,
 *     format matches the OpenNext built-ins).
 *  2. Patch `.open-next/worker.js` to add `export { ClassroomRoom } from
 *     "./.build/durable-objects/classroom-room.js";` immediately after
 *     the existing built-in DO re-exports.
 *
 * The script is idempotent: re-running it does not stack up duplicate
 * `export` statements because we patch by exact-string match.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const esbuildPath = require.resolve("esbuild");
const esbuild = require(esbuildPath);

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const doSource = path.join(root, "src", "durable-objects", "classroom-room.ts");
const workerEntry = path.join(root, ".open-next", "worker.js");
const outDir = path.join(root, ".open-next", ".build", "durable-objects");
const outFile = path.join(outDir, "classroom-room.js");

function ensureDoSourceExists() {
  if (!fs.existsSync(doSource)) {
    console.error(`[build-classroom-room] missing source: ${doSource}`);
    process.exit(1);
  }
}

function ensureWorkerEntryExists() {
  if (!fs.existsSync(workerEntry)) {
    console.error(
      `[build-classroom-room] missing worker entry: ${workerEntry}\n` +
        `Run \`npm run build\` first to produce .open-next/worker.js.`
    );
    process.exit(1);
  }
}

async function bundle() {
  fs.mkdirSync(outDir, { recursive: true });
  await esbuild.build({
    entryPoints: [doSource],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "es2022",
    outfile: outFile,
    // Workers DO storage.sql & WebSocket come from the platform, not
    // node_modules. The DO class also imports from `@/lib/live-ticket`,
    // which only references `crypto.subtle` and `getEnv` (Worker-safe).
    external: ["cloudflare:workers"],
    logLevel: "warning",
  });
  console.log(`[build-classroom-room] bundled → ${path.relative(root, outFile)}`);
}

function patchWorkerEntry() {
  const original = fs.readFileSync(workerEntry, "utf8");
  const exportLine =
    "export { ClassroomRoom } from \"./.build/durable-objects/classroom-room.js\";";

  if (original.includes(exportLine)) {
    console.log("[build-classroom-room] worker.js already patched — skipping.");
    return;
  }

  // Anchor on the last built-in DO export and append ours right after.
  const anchor =
    "export { BucketCachePurge } from \"./.build/durable-objects/bucket-cache-purge.js\";";
  if (!original.includes(anchor)) {
    console.error(
      `[build-classroom-room] worker.js does not contain expected anchor:\n${anchor}\n` +
        `OpenNext may have changed its template. Manual intervention required.`
    );
    process.exit(2);
  }

  const patched = original.replace(
    anchor,
    `${anchor}\n${exportLine}`
  );
  fs.writeFileSync(workerEntry, patched, "utf8");
  console.log("[build-classroom-room] patched worker.js with ClassroomRoom export.");
}

async function main() {
  ensureDoSourceExists();
  ensureWorkerEntryExists();
  await bundle();
  patchWorkerEntry();
}

main().catch((err) => {
  console.error("[build-classroom-room] failed:", err);
  process.exit(1);
});