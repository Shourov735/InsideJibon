# InsideJibon

Educational platform — courses, exams, assignments, and student progress tracking.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Auth:** Clerk
- **Database:** PostgreSQL on Neon (via Drizzle ORM, HTTP driver)
- **Storage:** Backblaze B2 (planned, behind a storage service interface)
- **Hosting:** Cloudflare Workers (OpenNext adapter)

## Scripts

| Command            | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `npm run dev`      | Next.js dev server (Node)                            |
| `npm run build`    | Local production build (validation)                  |
| `npm run lint`     | ESLint                                               |
| `npm run preview`  | Production build in the Workers runtime (workerd)    |
| `npm run deploy`   | Build + deploy to Cloudflare Workers                 |
| `npm run db:generate` | Generate Drizzle migrations from schema          |
| `npm run db:migrate`  | Apply migrations to Neon                        |
| `npm run db:studio`   | Drizzle Studio (visual schema explorer)         |

## Environment

Copy `.env.example` to `.env.local` and fill in values. Secrets must also be
set on the deployed Worker (`wrangler secret put <NAME>`).

## Structure

```
src/
  app/            # routes — (marketing), (student), (teacher), (admin)
  components/     # UI + feature components (presentation only)
  db/             # Drizzle schema + migrations + client
  lib/            # env, auth helpers, permissions, storage interface, utils
  schemas/        # zod validation at trust boundaries
  services/       # business logic (called by actions/route handlers)
  types/          # shared domain types
```

## Deployment

`npm run deploy` builds the app with `@opennextjs/cloudflare` and deploys to
`insidejibon.<subdomain>.workers.dev`. Preview locally with `npm run preview`.

## Post-deploy smoke checklist

Run this after every deploy (or any secret change):

1. `curl -I https://insidejibon.insidejibon.workers.dev/` — expect `200`, the
   security headers (`x-frame-options: DENY`, `x-content-type-options: nosniff`,
   `referrer-policy`, `permissions-policy`) and **no** `x-powered-by`.
2. Unauthenticated: `curl -i https://insidejibon.insidejibon.workers.dev/admin`
   → `307` redirect to `/sign-in`; same for `/student` and `/teacher`.
3. Signed in: request the protected routes with a valid session token cookie
   (`__session=<jwt>`) → `200` for `/student`, role-appropriate `200` for
   `/teacher` and `/admin`, `307` → `/` for roles without access.
4. Garbage token (`__session=garbage`) on any protected route → `307`, never `500`.
5. Webhook: `POST /api/webhooks/clerk` without a signature → `400`; with an
   invalid signature → `400`; replay a signed `user.created` event → `200` and
   the row appears in Neon (`role='admin'` for the first user, `student` after).
6. Verify Clerk Dashboard → Webhooks is sending events and has not accumulated
   failed deliveries.

## Security invariants

- **Authorization lives at mutation entry points:** every server action and
  route handler must call `requireUser()`/`requireRole()` (from
  `src/lib/permissions.ts`) before doing anything. Layouts are not an
  authorization boundary — they do not re-run on client-side navigation.
- **Never trust client-provided identity:** user IDs and roles come only from
  the verified Clerk session token (`resolveCurrentUser` in `src/lib/auth.ts`)
  or from signed webhook payloads.
- **No `proxy.ts`/middleware:** Next.js 16 `proxy.ts` runs on the Node runtime
  and is unsupported on Cloudflare Workers (OpenNext #1279). Guard pages and
  actions explicitly.