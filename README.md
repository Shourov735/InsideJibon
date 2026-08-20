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