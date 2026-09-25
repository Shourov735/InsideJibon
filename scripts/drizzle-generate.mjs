// Generate the R4 migration snapshot by piping answers to drizzle-kit's
// interactive rename prompt (lesson_comments -> qa_threads).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const binPath = require.resolve('drizzle-kit/bin.cjs');

const Module = require('module');
const originalCompile = Module.prototype._compile;
let patched = false;
Module.prototype._compile = function (source, filename) {
  if (filename.endsWith('drizzle-kit/bin.cjs') && !patched) {
    patched = true;
    // Inject right after render10: override render10's TTY guard by
    // providing a fake stdin terminal. We do this by short-circuiting
    // the Terminal constructor's setRawMode call.
    source = source.replace(
      'function render10(view5) {',
      `function render10(view5) {
        // Bypass TTY requirement: when running headless, auto-select
        // the first option (which corresponds to "rename" in the
        // prompt's choice list).
        if (!process.stdin.isTTY || !process.stdout.isTTY) {
          if (view5 && view5.choices && Array.isArray(view5.choices)) {
            const first = view5.choices[0];
            return Promise.resolve(first ? first.value : view5.initialValue);
          }
          return Promise.resolve(view5.initialValue);
        }`
    );
  }
  return originalCompile.call(this, source, filename);
};

process.argv = ['node', 'drizzle-kit', 'generate'];
require(binPath);
