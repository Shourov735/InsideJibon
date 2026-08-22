import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Course thumbnails and avatars are arbitrary user-supplied URLs
      // (Clerk profile images, R2 objects, external hosts). next/image is not
      // usable here: it requires an allow-list of hosts and its default
      // optimizer is not supported on Cloudflare Workers (OpenNext). Plain
      // <img> is intentional.
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated build artifacts:
    ".open-next/**",
    ".wrangler/**",
    "scripts/*.cjs",
  ]),
]);

export default eslintConfig;
