# InsideJibon — Project Context

**Last Updated:** 2026-11-19  
**Application Type:** Full-Stack Bilingual Educational Platform (Next.js 16 App Router on Cloudflare Workers)  
**Project Overview:** InsideJibon is an academic platform tailored for Bangladeshi students and educators. It provides curriculum-aligned courses, YouTube-first video streaming, real-time interactive classrooms powered by Cloudflare Durable Objects, snapshot-isolated examination attempts with automated grading, student assignments, manual mobile banking verification (bKash/Nagad/Rocket), gamification (XP, streaks, leagues), and a parent monitoring portal.

**Primary Entry Points:**
- **Worker Entry (OpenNext):** [wrangler.jsonc](file:///home/shourov/Projects/insidejibon/wrangler.jsonc) (`.open-next/worker.js`)
- **Live Classroom Durable Object:** [classroom-room.ts](file:///home/shourov/Projects/insidejibon/src/durable-objects/classroom-room.ts)
- **Root Layout:** [layout.tsx](file:///home/shourov/Projects/insidejibon/src/app/layout.tsx)
- **Public Marketing:** [page.tsx](file:///home/shourov/Projects/insidejibon/src/app/(marketing)/page.tsx)
- **Student Dashboard:** [page.tsx](file:///home/shourov/Projects/insidejibon/src/app/student/page.tsx)
- **Teacher Studio:** [page.tsx](file:///home/shourov/Projects/insidejibon/src/app/teacher/page.tsx)
- **Admin Console:** [page.tsx](file:///home/shourov/Projects/insidejibon/src/app/admin/page.tsx)

---

## 1. Tech Stack & Key Dependencies

- **Language & Runtime:** TypeScript 5.x, Node.js 22 (development & build), Cloudflare Workers (`workerd` runtime with `nodejs_compat`)
- **Framework:** Next.js 16.3.6 (App Router, Server Actions, Route Handlers), React 19.2.8
- **Edge Deployment:** `@opennextjs/cloudflare` 1.20.2, Cloudflare Wrangler 4.140.0
- **Database & ORM:** Neon Serverless PostgreSQL (`@neondatabase/serverless` 1.1.0) with Drizzle ORM 0.45.2 (`drizzle-orm/neon-http`) & Drizzle Kit 0.31.11
- **Authentication:** Clerk (`@clerk/backend` 3.16.9, `@clerk/nextjs` 7.7.9) with manual server-side JWT verification
- **Edge Infrastructure & Storage:**
  - Cloudflare KV (`RATE_LIMIT_KV`, `SESSION_KV`, `FEATURE_FLAGS_KV`)
  - Cloudflare Queues (`NOTIFICATIONS_QUEUE`, `EMBEDDINGS_QUEUE`, `EXPORT_QUEUE`)
  - Cloudflare Durable Objects with SQLite storage (`ClassroomRoom` WebSocket room)
  - Cloudflare Vectorize (`lessons_v1` index, 384 dimensions) & Workers AI (`AI` binding)
  - Cloudflare R2 (`insidejibon-public` via custom domain `cdn.insidejibon.com.bd`)
- **Styling & UI:** Tailwind CSS v4 (`@tailwindcss/postcss` 4.x), `cmdk` 1.1.1, Academic Modernism design system
- **Validation:** Zod 4.4.3
- **i18n:** Custom bilingual dictionary engine (English `src/i18n/dictionaries/en.ts`, Bangla `src/i18n/dictionaries/bn.ts`)

---

## 2. Architecture & Data Flow

### Pattern: Modular Edge Monolith
- **Routing & Controllers (`src/app/`):** Role-partitioned routes `(marketing)`, `(auth)`, `student/`, `teacher/`, `admin/`, `parent/`, plus Server Actions (`actions/`) and API route handlers (`api/`).
- **Domain Services (`src/services/`):** Pure business logic isolated from HTTP concerns (exam validation, grading, live session scheduling, payment status transitions, cache invalidations).
- **Data Layer (`src/db/`):** Drizzle ORM models under `src/db/schema/` querying Neon via the HTTP driver (`neon-http`).
- **Infrastructure & Utilities (`src/lib/`):** Edge cache helpers, storage providers, rate limiting, and lazy environment access.
- **Stateful Edge Services (`src/durable-objects/`):** WebSockets and in-memory/SQLite state for real-time live classes.

### Request & Mutation Lifecycle
1. **Request Ingress:** Handled by Cloudflare Worker via OpenNext.
2. **Auth & Security Boundary:** Server Actions and Route Handlers manually call `resolveCurrentUser()` / `requireUser()` / `requireRole()` ([permissions.ts](file:///home/shourov/Projects/insidejibon/src/lib/permissions.ts)). Session is verified using `@clerk/backend` against Clerk JWKS with automatic PostgreSQL user row provisioning.
3. **Input Validation:** Incoming payloads are parsed and validated strictly with Zod schemas ([src/schemas/](file:///home/shourov/Projects/insidejibon/src/schemas)).
4. **Service Execution:** Domain services enforce business invariants (e.g. verifying exam draft state prior to modification, creating immutable snapshot at attempt start).
5. **Database Execution (No Transactions):** Neon HTTP driver operates statelessly over HTTP fetch. Multi-statement transactions are not supported; data integrity relies on atomic conditional `UPDATE` statements, unique constraints, and PostgreSQL error 23505 retry loops.
6. **Edge Caching & Tag Invalidation:** Read-heavy catalog queries utilize Cloudflare Cache API (`caches.default`). Mutations dispatch tag purges through [invalidate.ts](file:///home/shourov/Projects/insidejibon/src/services/cache/invalidate.ts) and log to `cache_invalidations`.
7. **Bilingual Localization:** Responses and user-facing error messages are resolved through `getTranslator()` ([server.ts](file:///home/shourov/Projects/insidejibon/src/i18n/server.ts)) or the error catalog ([errors.ts](file:///home/shourov/Projects/insidejibon/src/i18n/errors.ts)).

---

## 3. Annotated Project Structure

```
insidejibon/
├── .agents/                        # Agent configurations, workflows, and developer skills
├── .stitch/                        # Academic Modernism visual design tokens & UI templates
├── content/
│   └── legal/                      # Bilingual legal pages (cookies, privacy, refund, terms)
├── docs/                           # Architecture specs, master roadmaps, and phase blueprints
├── public/                         # Public static files, PWA manifests, icons, and fallbacks
├── scripts/                        # Build hooks, test runners, migrations, and utilities
│   ├── build-classroom-room.mjs    # Bundles ClassroomRoom DO into OpenNext worker output
│   ├── check-i18n.mjs              # Validates en.ts/bn.ts key & placeholder parity
│   ├── node-net-fix.cjs            # Happy Eyeballs DNS fix and server-only stub for Node
│   └── [17 domain scripts]         # Seed scripts and standalone domain integration suites
├── src/
│   ├── app/                        # Next.js 16 App Router hierarchy
│   │   ├── (auth)/                 # Clerk authentication routes (sign-in, sign-up, continue)
│   │   ├── (marketing)/            # Public catalog, course overview, and landing pages
│   │   ├── access-denied/          # 403 Forbidden handler with role context
│   │   ├── account/                # Student/teacher profile & email notification settings
│   │   ├── actions/                # Cross-cutting server actions (payments, parent invites)
│   │   ├── admin/                  # Admin back-office (user roles, payment reconciliations)
│   │   ├── api/                    # Route handlers (webhooks, cron triggers, live DO WS, exports)
│   │   ├── bundles/                # Course bundle discovery & purchase landing
│   │   ├── checkout/               # Mobile banking checkout flow (bKash/Nagad/Rocket)
│   │   ├── leaderboard/            # Global & league XP leaderboard pages
│   │   ├── legal/                  # Rendered legal documents with language switcher
│   │   ├── offline/                # PWA offline shell & background sync monitor
│   │   ├── parent/                 # Parent portal for monitoring child academic progress
│   │   ├── student/                # Student dashboard, course player, exams, assignments, badges
│   │   ├── teacher/                # Teacher studio for course, exam, and live class management
│   │   ├── error.tsx               # Root error boundary with bilingual error catalog fallback
│   │   ├── layout.tsx              # Root HTML layout with ClerkProvider and theme fonts
│   │   └── not-found.tsx           # Bilingual 404 handler
│   ├── components/                 # Presentation-only React components grouped by audience
│   │   ├── account/                # Notification preferences and profile widgets
│   │   ├── admin/                  # Payment audit tables and role management tools
│   │   ├── assignments/            # Assignment submission cards and grading interfaces
│   │   ├── auth/                   # Modal wrappers and auth buttons
│   │   ├── i18n/                   # LanguageSwitcher and localized wrappers
│   │   ├── materials/              # Secure material download buttons and previewers
│   │   ├── parent/                 # Parent alert settings and child performance widgets
│   │   ├── public/                 # Marketing hero, course cards, preview video player
│   │   ├── shared/                 # Atomic UI kit: Button, Modal, Card, Input, Toast, Table
│   │   ├── student/                # Video player router (YouTube/HLS), exam proctoring UI, XP badges
│   │   └── teacher/                # Curriculum builder, exam question editor, live class controls
│   ├── db/                         # Database layer
│   │   ├── index.ts                # Drizzle client factory with Neon HTTP driver
│   │   ├── migrations/             # [23 migration files: 0000_*.sql to 0022_*.sql, meta/]
│   │   └── schema/                 # Drizzle schemas (users, courses, exams, payments, etc.)
│   ├── durable-objects/            # Cloudflare Durable Objects
│   │   └── classroom-room.ts       # Live class room with SQLite chat log & WebSocket presence
│   ├── emails/                     # Transactional email templates (digest, live reminder)
│   ├── i18n/                       # Internationalization subsystem
│   │   ├── dictionaries/           # en.ts (source of truth) and bn.ts dictionaries
│   │   ├── client.tsx              # useTranslations() hook for client components
│   │   ├── server.ts               # getTranslator() async helper for server components
│   │   └── errors.ts               # Localized system error catalog
│   ├── lib/                        # Cross-cutting libraries and infrastructure bindings
│   │   ├── auth.ts                 # Clerk JWT verification and auto-provisioning
│   │   ├── permissions.ts          # Server-side authorization guards (requireUser, requireRole)
│   │   ├── env.ts                  # Zod-validated lazy environment configuration
│   │   ├── live-ticket.ts          # HMAC-SHA256 WebSocket ticket signer for Durable Objects
│   │   ├── cloudflare/             # Bindings for Cache API, KV, Queues, Workers AI, R2
│   │   ├── storage/                # Storage abstraction (R2, Public CDN, in-memory mock)
│   │   └── video/                  # YouTube URL parser and oEmbed reachability validator
│   ├── schemas/                    # Zod validation schemas for forms, actions, and API payloads
│   ├── services/                   # Decoupled business logic (exams, courses, payments, gamification)
│   ├── styles/                     # Global CSS rules and Tailwind design system directives
│   └── types/                      # Shared domain types and TypeScript contracts
├── tests/                          # E2E, integration, and security test suites
│   └── e2e/r2/                     # Multi-tier testing suite (features, boundaries, scenarios)
├── AGENTS.md                       # Critical system rules and Cloudflare/Next.js constraints
├── drizzle.config.ts               # Drizzle Kit configuration pointing to Neon PostgreSQL
├── next.config.ts                  # CSP headers, image remote domains, and Next.js settings
├── open-next.config.ts             # OpenNext Cloudflare Workers build adapter config
├── package.json                    # Dependencies, scripts, and runtime engines
├── tsconfig.json                   # TypeScript config with @/* and @/content/* path aliases
└── wrangler.jsonc                  # Cloudflare Workers configuration (KV, DO, Queues, AI, Crons)
```

---

## 4. Core Data Models & API Surface

### Core Database Tables (`src/db/schema/`)
- **`users` ([users.ts](file:///home/shourov/Projects/insidejibon/src/db/schema/users.ts)):** `id` (Clerk User ID), `email`, `name`, `role` (`student` | `teacher` | `admin` | `parent`), `image_url`.
- **`courses` & `lessons` ([courses.ts](file:///home/shourov/Projects/insidejibon/src/db/schema/courses.ts)):** `courses` (`id`, `teacher_id`, `title`, `slug`, `price`, `status`: `draft` | `published` | `archived`); `modules`; `lessons` (`module_id`, `title`, `video_provider`: `youtube` | `r2_hls` | `external`, `youtube_video_id`, `is_free`).
- **`course_enrollments` & `lesson_progress` ([learning.ts](file:///home/shourov/Projects/insidejibon/src/db/schema/learning.ts)):** `course_enrollments` (`student_id`, `course_id`, `status`: `pending` | `enrolled` | `completed`); `lesson_progress` (`student_id`, `lesson_id`, `completed`, `last_position_seconds`).
- **`exams`, `exam_attempts`, `exam_answers` ([exams.ts](file:///home/shourov/Projects/insidejibon/src/db/schema/exams.ts)):** `exams` (`course_id`, `time_limit_minutes`, `passing_score`, `max_attempts`); `exam_questions` & `exam_options`; `exam_attempts` (`exam_id`, `student_id`, `content_snapshot` [JSONB of questions/options], `score`, `passed`, `status`).
- **`assignments` & `assignment_submissions` ([assignments.ts](file:///home/shourov/Projects/insidejibon/src/db/schema/assignments.ts)):** `assignments` (`course_id`, `due_date`, `max_score`); `assignment_submissions` (`assignment_id`, `student_id`, `score`, `feedback`, `status`).
- **`class_sessions` ([classes.ts](file:///home/shourov/Projects/insidejibon/src/db/schema/classes.ts)):** `course_id`, `teacher_id`, `scheduled_at`, `status` (`scheduled` | `live` | `ended`), `live_url`.
- **`payment_submissions` ([payments.ts](file:///home/shourov/Projects/insidejibon/src/db/schema/payments.ts)):** `student_id`, `scope_kind` (`course` | `bundle`), `scope_id`, `amount`, `payment_method` (`bkash` | `nagad` | `rocket` | `bank`), `transaction_id`, `sender_phone`, `status` (`pending` | `approved` | `rejected`).
- **`gamification` ([streaks.ts](file:///home/shourov/Projects/insidejibon/src/db/schema/streaks.ts), [badges.ts](file:///home/shourov/Projects/insidejibon/src/db/schema/badges.ts), [leagues.ts](file:///home/shourov/Projects/insidejibon/src/db/schema/leagues.ts), [energy.ts](file:///home/shourov/Projects/insidejibon/src/db/schema/energy.ts)):** Student XP counters, daily study streaks, league tier standings, and energy limits.
- **`cache_invalidations` ([cache.ts](file:///home/shourov/Projects/insidejibon/src/db/schema/cache.ts)):** Edge cache tag purge audit log.

### Key API Routes & WebSocket Handlers
- `POST /api/webhooks/clerk`: Clerk user sync webhook. Returns `200 OK` on malformed/permanent errors to avoid retries.
- `GET /api/me`: Returns the resolved active user record.
- `GET /api/live/[sessionId]/room`: Upgrades connection to WebSocket talking to the `ClassroomRoom` Durable Object.
- `GET /api/live/ical`: Export class timetable as an `.ics` feed.
- `GET /api/materials/[materialId]/download`: Generates secure R2 signed stream for course materials.
- `POST /api/push/subscribe`: Registers Web Push VAPID subscriptions.
- `POST /api/offline/sync`: Processes queued actions stored by the PWA service worker.
- `POST /api/cron/*`: Cron job triggers (`leaderboard`, `energy-refill`, `streak-freezes`, `weekly-leagues`, `proctor-purge`). Protected by Cloudflare cron secret.

### Key Server Actions
- **Student Actions:**
  - `enrollCourse` ([enroll-actions.ts](file:///home/shourov/Projects/insidejibon/src/app/student/actions/enroll-actions.ts)): Initiate enrollment.
  - `submitExamAttempt` / `saveExamAnswer` ([exam-actions.ts](file:///home/shourov/Projects/insidejibon/src/app/student/actions/exam-actions.ts)): Submit and autosave exam responses.
  - `updateLessonProgress` ([progress-actions.ts](file:///home/shourov/Projects/insidejibon/src/app/student/actions/progress-actions.ts)): Sync video watch time and completion.
  - `submitPayment` ([payment-submissions-actions.ts](file:///home/shourov/Projects/insidejibon/src/app/actions/payment-submissions-actions.ts)): Submit manual mobile banking transaction details.
- **Teacher Actions:**
  - `createCourse` / `publishCourse` ([course-actions.ts](file:///home/shourov/Projects/insidejibon/src/app/teacher/courses/actions/course-actions.ts)): Course lifecycle management.
  - `createLesson` / `updateLesson` ([lesson-actions.ts](file:///home/shourov/Projects/insidejibon/src/app/teacher/courses/actions/lesson-actions.ts)): Manage video attachments and curriculum ordering.
  - `createExam` / `publishExam` ([exam-actions.ts](file:///home/shourov/Projects/insidejibon/src/app/teacher/exams/actions/exam-actions.ts)): Author exams and freeze structure on publication.
  - `scheduleClass` / `startClass` / `endClass` ([class-actions.ts](file:///home/shourov/Projects/insidejibon/src/app/teacher/courses/[courseId]/classes/actions/class-actions.ts)): Real-time live session lifecycle.
  - `approveEnrollment` / `rejectEnrollment` ([enrollment-decision-actions.ts](file:///home/shourov/Projects/insidejibon/src/app/actions/enrollment-decision-actions.ts)): Verify payment submissions.

---

## 5. Coding Conventions & Project Rules

### Cloudflare Workers & Next.js Constraints
1. **Manual Server-Side Auth Only:**
   - **Never use `clerkMiddleware()` or Next.js `proxy.ts`.** Cloudflare Workers cannot run Node-runtime middleware.
   - All protected Server Actions and Route Handlers must explicitly call `requireUser()` or `requireRole("student" | "teacher" | "admin" | "parent")` from [permissions.ts](file:///home/shourov/Projects/insidejibon/src/lib/permissions.ts).
   - Layouts are **not** security boundaries; they do not re-run during client-side navigation.
2. **Neon Database Stateless HTTP Driver:**
   - Database operations use `@neondatabase/serverless` over HTTP (`drizzle-orm/neon-http`).
   - **No multi-statement transactions:** Never write `db.transaction()`. Enforce concurrency safety through atomic conditional `UPDATE` statements, unique constraints, and PostgreSQL error code 23505 retry blocks.
3. **Lazy Environment Resolution:**
   - On Workers, `process.env` is populated per request. Always invoke `getEnv()` from [env.ts](file:///home/shourov/Projects/insidejibon/src/lib/env.ts) and `getDb()` from [src/db/index.ts](file:///home/shourov/Projects/insidejibon/src/db/index.ts) inside function scopes, never at top-level module scope.
4. **Exam Immutability Architecture:**
   - When a student begins an exam, [attempts.ts](file:///home/shourov/Projects/insidejibon/src/services/exams/attempts.ts) freezes the questions, options, and correct answers into `exam_attempts.content_snapshot` (JSONB).
   - Grading ([grading.ts](file:///home/shourov/Projects/insidejibon/src/services/exams/grading.ts)) reads exclusively from `content_snapshot`. Modifying a draft exam does not alter active attempts. Published exams are structurally frozen.
5. **Bilingual Localization Rules:**
   - The UI is fully bilingual (English and Bangla).
   - `src/i18n/dictionaries/en.ts` is the source of truth. `src/i18n/dictionaries/bn.ts` must maintain exact key and placeholder parity (`{param}`).
   - Verify parity before committing with `npm run check:i18n`. Do not translate teacher-authored content (titles/descriptions).
6. **Deploy & Build Discipline:**
   - Pushes to `main` trigger Cloudflare Workers Builds Git integration.
   - The deploy command must always execute `npm run deploy:only` (which runs `scripts/build-classroom-room.mjs` and sets `OPEN_NEXT_DEPLOY=true`). Never chain a bare `wrangler deploy`, which wipes the compiled Durable Object export.

### Path Aliases & Imports
- `@/*` maps to `./src/*`
- `@/content/*` maps to `./content/*`

### Environment Variables (Names Only)
- Required: `DATABASE_URL`, `CLERK_SECRET_KEY`
- Optional / Runtime Inlined: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`
- Infrastructure Bindings: `RATE_LIMIT_KV_URL`, `SESSION_KV_URL`, `FEATURE_FLAGS_KV_URL`, `PUBLIC_BUCKET_PUBLIC_URL`, `NEXT_PUBLIC_PUBLIC_BUCKET_URL`
- Web Push & DO Tickets: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CLASSROOM_TICKET_SECRET`

---

## 6. Common Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Launch local Next.js development server with Node net fix |
| `npm run build` | Validate production build locally (Node.js target) |
| `npm run lint` | Run ESLint across all files |
| `npm run check:i18n` | Verify English & Bangla dictionary key and `{param}` parity |
| `npm run build:cf` | Build OpenNext Worker and bundle the live classroom Durable Object |
| `npm run preview` | Run local production simulation in Cloudflare workerd runtime |
| `npm run deploy` | Full build and deployment to Cloudflare Workers |
| `npm run deploy:only` | Patch DO and deploy existing build artifact (`OPEN_NEXT_DEPLOY=true`) |
| `npm run db:generate` | Generate new Drizzle SQL migration files from schema |
| `npm run db:migrate` | Apply pending database migrations to Neon PostgreSQL |
| `npm run db:studio` | Open visual Drizzle Studio schema explorer |

---

## 7. Instructions for External AI

- Reference the exact file paths and import aliases defined in this document.
- Follow the existing tech stack, validation libraries, and error-handling conventions.
- If you need to inspect the full code of any specific file listed in the project tree before proposing changes, ask the user to provide that file by its exact path.
