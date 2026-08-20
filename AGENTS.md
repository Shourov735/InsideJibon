InsideJibon is a Next.js 16 App Router application deployed to Cloudflare Workers through OpenNext.

Never assume Vercel APIs, Node-only runtime APIs, or Next.js middleware/proxy compatibility with Cloudflare Workers.

Authentication uses Clerk with manual server-side JWT verification through @clerk/backend; do not introduce clerkMiddleware() unless Cloudflare/OpenNext compatibility has been explicitly verified.

Authorization must be enforced at every Server Action and Route Handler that accesses protected data. Layouts are not security boundaries.

Database: Neon PostgreSQL + Drizzle using the Workers-compatible HTTP driver.

File storage: Cloudflare R2 through the application's storage abstraction.

Identity: Clerk.

Application roles: student, teacher, admin.

UI language: Bangla + English.

UI visual direction: Academic Modernism and the existing .stitch/ designs.

Never expose secrets to the client.

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
- **Exams (Phase 3A):** the exam domain lives in `src/services/exams/`.
  Ownership is always resolved in the database (exam → course → teacherId;
  question/option → exam_questions → exam → course → teacherId) and
  cross-teacher access behaves like Not Found (identical `"Exam not found."`).
  Publishing preconditions are enforced authoritatively in
  `validateExamForPublishing`/`publishExam`. Only draft exams are structurally
  editable — published exams are frozen (questions/options/reorder/delete
  blocked) and cannot be deleted until unpublished or archived.
- **Exams (Phase 4 — student attempts):** attempts live in
  `src/services/exams/attempts.ts`, grading in `src/services/exams/grading.ts`.
  Immutability is snapshot-based: at attempt start the exact question/option
  set incl. correct answers is captured into `exam_attempts.content_snapshot`;
  grading and results read ONLY the snapshot, and `exam_answers` references
  questions/options by plain UUIDs (no FKs). `drizzle-orm/neon-http` has NO
  transactions — race safety relies on atomic conditional UPDATEs, unique
  constraints, and 23505 retry loops (never assume transactional semantics).
  `max_attempts` counts submitted attempts only, hard-guarded inside the
  atomic submit UPDATE.
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
