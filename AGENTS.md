<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# InsideJibon conventions

- **Auth is manual, server-side only:** `resolveCurrentUser()` /
  `getCurrentUser()` in `src/lib/auth.ts` verify the `__session` cookie against
  the Clerk JWKS. Never use `clerkMiddleware()`/`auth()` from `@clerk/nextjs` —
  middleware cannot run on Cloudflare Workers (Next 16 `proxy.ts` is Node-runtime
  only; see `src/lib/auth.ts` and README).
- **Authorize at every mutation entry point:** every server action and route
  handler must call `requireUser()`/`requireRole()` from `src/lib/permissions.ts`
  first. Layouts do not re-run on client-side navigation and are NOT an
  authorization boundary.
- **Lazy env/db access:** on Workers, `process.env` is populated per request.
  Always call `getEnv()`/`getDb()` inside handlers, never at module scope.
- **Env is per-runtime:** `.env.local` holds secrets for local dev; deployed
  secrets live on the Worker (`wrangler secret put`). After changing worker
  secrets, run the README smoke checklist.
- **Webhook discipline:** the Clerk webhook route must never 400 on permanent
  conditions (missing email, bad shape) — acknowledge with 200 to stop retries.
  All payloads are zod-validated.
- **Deploy:** `npm run deploy` (build + wrangler deploy). Verify with the README
  post-deploy smoke checklist.
