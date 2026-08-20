#!/usr/bin/env node
/**
 * i18n dictionary parity check.
 *
 * Verifies that src/i18n/dictionaries/en.ts (source of truth) and bn.ts
 * expose identical key sets and identical {param} placeholders, and that
 * neither file contains duplicate keys. Exits non-zero on any violation.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (f) => readFileSync(path.join(root, f), "utf8");

function parseKeys(source) {
  const keys = [];
  const seen = new Map();
  const dupes = [];
  for (const line of source.split("\n")) {
    const m = line.match(/^\s*"([a-zA-Z0-9._]+)":\s*"(.*)",?\s*$/);
    if (!m) continue;
    const [, key, value] = m;
    if (seen.has(key)) dupes.push(key);
    seen.set(key, true);
    const params = [...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((p) => p[1]);
    keys.push({ key, params: [...new Set(params)].sort() });
  }
  return { keys, dupes };
}

const en = parseKeys(read("src/i18n/dictionaries/en.ts"));
const bn = parseKeys(read("src/i18n/dictionaries/bn.ts"));

const enKeys = new Set(en.keys.map((k) => k.key));
const bnKeys = new Set(bn.keys.map((k) => k.key));

let failed = false;
const report = (msg) => {
  failed = true;
  console.error(`✗ ${msg}`);
};

for (const d of [en, bn]) {
  if (d.dupes.length) {
    report(`duplicate keys in ${d === en ? "en.ts" : "bn.ts"}: ${d.dupes.join(", ")}`);
  }
}

const missingInBn = en.keys.filter((k) => !bnKeys.has(k.key));
if (missingInBn.length) {
  report(`missing in bn.ts (${missingInBn.length}): ${missingInBn.map((k) => k.key).join(", ")}`);
}

const extraInBn = bn.keys.filter((k) => !enKeys.has(k.key));
if (extraInBn.length) {
  report(`extra in bn.ts (${extraInBn.length}): ${extraInBn.map((k) => k.key).join(", ")}`);
}

const bnByKey = new Map(bn.keys.map((k) => [k.key, k.params]));
for (const k of en.keys) {
  const bnParams = bnByKey.get(k.key);
  if (!bnParams) continue;
  const enParams = k.params.join(",");
  const bParams = bnParams.join(",");
  if (enParams !== bParams) {
    report(
      `param mismatch for "${k.key}": en{${enParams}} vs bn{${bParams}}`
    );
  }
}

if (failed) {
  console.error("\ni18n check failed — fix the violations above.");
  process.exit(1);
}
console.log(`i18n OK — ${en.keys.length} keys, full en/bn parity.`);