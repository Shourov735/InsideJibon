# InsideJibon

Educational platform — courses, exams, assignments, and student progress tracking.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Auth:** Clerk
- **Database:** PostgreSQL on Neon (via Drizzle ORM, HTTP driver)
- **Storage:** Cloudflare R2 (`MATERIALS_BUCKET` binding via modular storage interface)
- **Hosting:** Cloudflare Workers (OpenNext adapter)

## Documentation & Roadmap

- **Master Implementation Roadmap & Prompts:** [`docs/MASTER_ROADMAP.md`](./docs/MASTER_ROADMAP.md)
- **Phase 2 (Enrollment & Learning):** [`docs/phase-2-student-enrollment-learning.md`](./docs/phase-2-student-enrollment-learning.md)
- **Phase 3/3A (Materials & Exams Domain):** [`docs/phase-3a-teacher-examinations.md`](./docs/phase-3a-teacher-examinations.md)
- **Phase 4 (Student Exams & Grading):** [`docs/phase-4-student-exams.md`](./docs/phase-4-student-exams.md)
- **Phase 4.5 / 6 (Assignments & Grading):** [`docs/phase-6-assignments.md`](./docs/phase-6-assignments.md)
- **Phase 5 (Classes, Announcements & Admin):** [`docs/phase-5-classes-announcements-admin.md`](./docs/phase-5-classes-announcements-admin.md)

## Scripts

| Command            | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `npm run dev`      | Next.js dev server (Node)                            |
| `npm run build`    | Local production build (validation)                  |
| `npm run lint`     | ESLint                                               |
| `npm run check:i18n` | Verify en/bn dictionary key + param parity        |
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

## i18n

The UI is bilingual (English + Bangla). `en.ts` in `src/i18n/dictionaries/` is
the source of truth: a flat object of dotted keys, values may contain
`{param}` placeholders. `bn.ts` is typed as `Dictionary`, so TypeScript
enforces that both files expose the exact same key set.

- **Server components:** `const t = await getTranslator()` (from
  `@/i18n/server`) → `t("key", { param })`, `t.tn("keyBase", count)` for
  `_one`/`_other` plurals, `t.locale` for locale-aware formatting.
- **Client components:** `const { t, tn, locale } = useTranslations()` (from
  `@/i18n/client`) — always destructure `tn`; it does not exist as `t.tn`.
- **Language switcher:** `LanguageSwitcher` in the marketing nav sets the
  `ij_lang` cookie (`en`/`bn`); `getTranslator()` resolves locale per request.
- **Dates/labels:** pass `t.locale`/`locale` into `formatMaterialDate` and
  `getFileTypeLabel` (`src/lib/material-utils.ts`).
- **Errors:** server actions wrap error strings with `localizeMessage(...)`;
  service messages map through the `ERROR_CATALOG` in `src/i18n/errors.ts`.
  Publish-validation messages are localized via the `teacher.publishCheck.*`
  keys threaded into `validateExamForPublishing`/`validateCourseForPublishing`.
- **Verification:** `npm run check:i18n` asserts key parity, no duplicate
  keys, and matching `{param}` sets between `en.ts` and `bn.ts`.

Rules of thumb: metadata titles/descriptions stay English; teacher-authored
content (course/exam/lesson titles) is never translated; badge strings that
are bilingual in the UI keep both languages in the `bn.ts` value.

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