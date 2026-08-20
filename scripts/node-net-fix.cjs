// Local development workaround (Node.js only, not deployed):
// This network has ~300ms latency to Neon (us-west-2), which exceeds Node's
// default 250ms per-attempt Happy Eyeballs timeout. Every DNS-based connect
// to Neon fails with ETIMEDOUT. Raising the attempt timeout fixes it.
// Loaded via NODE_OPTIONS in npm scripts that need outbound connections.
const net = require("node:net");
net.setDefaultAutoSelectFamilyAttemptTimeout(5000);

// Stub 'server-only' package when running outside Next.js bundler (e.g. tsx test scripts)
const Module = require("node:module");
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === "server-only") return {};
  return originalRequire.apply(this, arguments);
};